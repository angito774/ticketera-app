import { randomUUID } from "node:crypto";

import { and, desc, eq, isNotNull, isNull, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import { events, orders, organizations, settlements } from "@/db/schema";
import { computeApplicationFee, parseFeeConfig } from "@/lib/application-fee";
import { isDivisionByZero, isUniqueViolation } from "@/lib/pg-errors";
import { getStripe } from "@/lib/stripe";
import { AdminError } from "@/modules/admin/services/admin.service";
import type { CurrentUser } from "@/modules/auth/services/current-user.service";
import { can } from "@/modules/auth/services/permissions";
import {
  isEventSettleable,
  parseSettlementDelayHours,
  summarizeSettlement,
  toFailureCode,
} from "@/modules/payments/services/settlement.mapping";

const HOUR_MS = 3_600_000;
const MAX_CLAIM_ATTEMPTS = 2;
const LIST_LIMIT = 100;
const NO_PERMISSION = "Sin permiso";

export interface SettlementCandidate {
  eventId: string;
  eventTitle: string;
  organizationName: string;
  orders: number;
  gross: number;
  fee: number;
  payout: number;
}

export interface SettlementRow {
  id: string;
  eventId: string;
  eventTitle: string;
  organizationName: string;
  gross: number;
  fee: number;
  payout: number;
  status: "pending" | "paid" | "failed";
  attempts: number;
  failureCode: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

export type SettleResult = {
  status: "paid" | "failed" | "skipped";
  settlementId?: string;
  reason?: string;
};

type Actor = CurrentUser | "system";

function assertCanSettle(actor: Actor): void {
  if (actor !== "system" && !can(actor, "organizations:manage")) throw new AdminError(NO_PERMISSION);
}

function transferGroup(eventId: string): string {
  return `event_${eventId}`;
}

/**
 * Reclama las órdenes pagadas y sin liquidar del evento y asigna su comisión. Aborta (división por cero) si
 * el número reclamado o el de órdenes pagadas sin liquidar no es el leído: así ninguna orden queda fuera
 * ni se liquida una reembolsada entre la lectura y el reclamo.
 */
function claimOrdersSql(
  eventId: string,
  settlementId: string,
  perOrderFee: { orderId: string; fee: number }[],
) {
  const payload = JSON.stringify(perOrderFee.map((o) => ({ id: o.orderId, fee: o.fee })));
  return sql`with upd as (
    update orders o set settlement_id = ${settlementId}::uuid, application_fee_amount = v.fee, updated_at = now()
    from jsonb_to_recordset(${payload}::jsonb) as v(id uuid, fee integer)
    where o.id = v.id and o.event_id = ${eventId}::uuid and o.status = 'paid' and o.settlement_id is null
      and exists (select 1 from events where id = ${eventId}::uuid and status = 'published')
    returning o.id
  ) select 1 / (case
    when (select count(*) from upd) = ${perOrderFee.length}
      and (select count(*) from orders where event_id = ${eventId}::uuid and status = 'paid' and settlement_id is null
        and exists (select 1 from events where id = ${eventId}::uuid and status = 'published')) = ${perOrderFee.length}
    then 1 else 0 end)`;
}

async function findExistingTransferId(
  settlementId: string,
  eventId: string,
  accountId: string,
): Promise<string | null> {
  const list = await getStripe().transfers.list({
    destination: accountId,
    transfer_group: transferGroup(eventId),
    limit: 20,
  });
  const found = list.data.find((t) => t.metadata?.settlementId === settlementId && !t.reversed);
  return found?.id ?? null;
}

async function markPaid(settlementId: string, transferId: string | null): Promise<void> {
  await db
    .update(settlements)
    .set({
      status: "paid",
      stripeTransferId: transferId,
      failureCode: null,
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(settlements.id, settlementId), eq(settlements.status, "pending")));
}

async function markFailed(settlementId: string, failureCode: string): Promise<void> {
  await db
    .update(settlements)
    .set({ status: "failed", failureCode, updatedAt: new Date() })
    .where(and(eq(settlements.id, settlementId), eq(settlements.status, "pending")));
}

/**
 * Crea el Transfer de una liquidación `pending`. En reintentos busca antes un Transfer ya creado (un fallo
 * ambiguo de red podría haberlo emitido) para no pagar dos veces con la clave nueva.
 */
async function transferSettlement(args: {
  settlementId: string;
  eventId: string;
  accountId: string;
  payout: number;
  currency: string;
  attempts: number;
}): Promise<"paid" | "failed"> {
  const { settlementId, eventId, accountId, payout, currency, attempts } = args;
  if (payout <= 0) {
    await markPaid(settlementId, null);
    return "paid";
  }
  try {
    const existing = attempts > 1 ? await findExistingTransferId(settlementId, eventId, accountId) : null;
    const transferId =
      existing ??
      (
        await getStripe().transfers.create(
          {
            amount: payout,
            currency: currency.toLowerCase(),
            destination: accountId,
            transfer_group: transferGroup(eventId),
            metadata: { settlementId, eventId },
          },
          { idempotencyKey: `settlement-${settlementId}-${attempts}` },
        )
      ).id;
    await markPaid(settlementId, transferId);
    return "paid";
  } catch (error) {
    await markFailed(settlementId, toFailureCode(error));
    return "failed";
  }
}

async function loadEventContext(eventId: string) {
  const [row] = await db
    .select({
      eventId: events.id,
      status: events.status,
      startsAt: events.startsAt,
      organizationId: organizations.id,
      stripeAccountId: organizations.stripeAccountId,
      connectStatus: organizations.stripeConnectStatus,
    })
    .from(events)
    .innerJoin(organizations, eq(events.organizationId, organizations.id))
    .where(eq(events.id, eventId))
    .limit(1);
  if (!row) return null;
  const [existing] = await db
    .select({ status: settlements.status })
    .from(settlements)
    .where(eq(settlements.eventId, eventId))
    .limit(1);
  const unsettled = await db
    .select({ id: orders.id, totalAmount: orders.totalAmount })
    .from(orders)
    .where(and(eq(orders.eventId, eventId), eq(orders.status, "paid"), isNull(orders.settlementId)))
    .orderBy(orders.id);
  return { ...row, existingSettlement: existing?.status ?? ("none" as const), unsettled };
}

export async function listSettlementCandidates(now: Date = new Date()): Promise<SettlementCandidate[]> {
  const config = parseFeeConfig(process.env);
  const delayHours = parseSettlementDelayHours(process.env);
  const cutoff = new Date(now.getTime() - delayHours * HOUR_MS);

  const rows = await db
    .select({
      eventId: events.id,
      eventTitle: events.title,
      organizationName: organizations.name,
      orders: sql<number>`count(${orders.id})::int`,
      gross: sql<number>`coalesce(sum(${orders.totalAmount}), 0)::float8`,
    })
    .from(events)
    .innerJoin(organizations, eq(events.organizationId, organizations.id))
    .innerJoin(
      orders,
      and(eq(orders.eventId, events.id), eq(orders.status, "paid"), isNull(orders.settlementId)),
    )
    .leftJoin(settlements, eq(settlements.eventId, events.id))
    .where(
      and(
        eq(events.status, "published"),
        lte(events.startsAt, cutoff),
        eq(organizations.stripeConnectStatus, "active"),
        isNotNull(organizations.stripeAccountId),
        isNull(settlements.id),
      ),
    )
    .groupBy(events.id, events.title, events.startsAt, organizations.name)
    .orderBy(events.startsAt);

  return rows.map((row) => {
    const fee = computeApplicationFee(row.gross, config);
    return { ...row, fee, payout: row.gross - fee };
  });
}

export async function listSettlements(actor: CurrentUser): Promise<SettlementRow[]> {
  if (!can(actor, "organizations:manage")) throw new AdminError(NO_PERMISSION);
  const rows = await db
    .select({
      id: settlements.id,
      eventId: settlements.eventId,
      eventTitle: events.title,
      organizationName: organizations.name,
      gross: settlements.grossAmount,
      fee: settlements.feeAmount,
      payout: settlements.payoutAmount,
      status: settlements.status,
      attempts: settlements.attempts,
      failureCode: settlements.failureCode,
      paidAt: settlements.paidAt,
      createdAt: settlements.createdAt,
    })
    .from(settlements)
    .innerJoin(events, eq(settlements.eventId, events.id))
    .innerJoin(organizations, eq(settlements.organizationId, organizations.id))
    .orderBy(desc(settlements.createdAt))
    .limit(LIST_LIMIT);
  return rows;
}

export async function settleEvent(
  actor: Actor,
  eventId: string,
  now: Date = new Date(),
): Promise<SettleResult> {
  assertCanSettle(actor);
  const config = parseFeeConfig(process.env);
  const delayHours = parseSettlementDelayHours(process.env);

  for (let attempt = 1; attempt <= MAX_CLAIM_ATTEMPTS; attempt += 1) {
    const ctx = await loadEventContext(eventId);
    if (!ctx) return { status: "skipped", reason: "Evento no encontrado" };

    const verdict = isEventSettleable({
      eventStatus: ctx.status,
      startsAt: ctx.startsAt,
      now,
      delayHours,
      connectStatus: ctx.connectStatus,
      hasAccount: ctx.stripeAccountId !== null,
      existingSettlement: ctx.existingSettlement,
      unsettledPaidOrders: ctx.unsettled.length,
    });
    if (!verdict.ok || !ctx.stripeAccountId) {
      return { status: "skipped", reason: verdict.ok ? "Cuenta de pagos no disponible" : verdict.reason };
    }

    const summary = summarizeSettlement(ctx.unsettled, config);
    const settlementId = randomUUID();
    try {
      await db.batch([
        db.insert(settlements).values({
          id: settlementId,
          eventId,
          organizationId: ctx.organizationId,
          grossAmount: summary.gross,
          feeAmount: summary.fee,
          payoutAmount: summary.payout,
          status: "pending",
          attempts: 1,
        }),
        db.execute(claimOrdersSql(eventId, settlementId, summary.perOrderFee)),
      ]);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return { status: "skipped", reason: "La liquidación del evento ya está en proceso o liquidada" };
      }
      if (isDivisionByZero(error)) continue;
      throw error;
    }

    const status = await transferSettlement({
      settlementId,
      eventId,
      accountId: ctx.stripeAccountId,
      payout: summary.payout,
      currency: "PEN",
      attempts: 1,
    });
    return { status, settlementId };
  }
  return { status: "skipped", reason: "Las órdenes cambiaron durante la liquidación; intenta de nuevo" };
}

export async function retrySettlement(
  actor: CurrentUser,
  settlementId: string,
): Promise<{ status: "paid" | "failed" }> {
  if (!can(actor, "organizations:manage")) throw new AdminError(NO_PERMISSION);

  const [current] = await db
    .select({
      status: settlements.status,
      stripeAccountId: organizations.stripeAccountId,
      connectStatus: organizations.stripeConnectStatus,
    })
    .from(settlements)
    .innerJoin(organizations, eq(settlements.organizationId, organizations.id))
    .where(eq(settlements.id, settlementId))
    .limit(1);
  if (!current) throw new AdminError("Liquidación no encontrada");
  if (current.status !== "failed") throw new AdminError("Solo se reintentan liquidaciones fallidas");
  if (!current.stripeAccountId || current.connectStatus !== "active") {
    throw new AdminError("La cuenta de pagos de la organización no está activa");
  }

  const [claimed] = await db
    .update(settlements)
    .set({
      status: "pending",
      attempts: sql`${settlements.attempts} + 1`,
      failureCode: null,
      updatedAt: new Date(),
    })
    .where(and(eq(settlements.id, settlementId), eq(settlements.status, "failed")))
    .returning({
      eventId: settlements.eventId,
      payout: settlements.payoutAmount,
      currency: settlements.currency,
      attempts: settlements.attempts,
    });
  if (!claimed) throw new AdminError("La liquidación ya está en proceso");

  const status = await transferSettlement({
    settlementId,
    eventId: claimed.eventId,
    accountId: current.stripeAccountId,
    payout: claimed.payout,
    currency: claimed.currency,
    attempts: claimed.attempts,
  });
  return { status };
}

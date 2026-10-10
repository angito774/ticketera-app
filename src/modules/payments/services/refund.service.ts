import { and, asc, count, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { db } from "@/db";
import { events, orderItems, orders, organizations, settlements, tickets, users } from "@/db/schema";
import { isDivisionByZero } from "@/lib/pg-errors";
import { getStripe } from "@/lib/stripe";
import { AdminError } from "@/modules/admin/services/admin.service";
import type { CurrentUser } from "@/modules/auth/services/current-user.service";
import { can } from "@/modules/auth/services/permissions";
import { releaseSoldSql } from "@/modules/checkout/services/purchase.query";
import {
  assertRefundable,
  clampRefundLimit,
  RefundRuleError,
  shouldReturnInventory,
} from "@/modules/payments/services/refund.mapping";
import type { CancelledEventRow } from "@/modules/payments/types/payments-admin.types";

type Statement = BatchItem<"pg">;
type BatchResult = { processed: number; failed: number; remaining: number };

const NOT_FOUND = "Orden no encontrada";

function requireAdmin(actor: CurrentUser): void {
  if (!can(actor, "organizations:manage")) throw new AdminError("Sin permiso");
}

const hasRedeemedTicket = sql`exists (
  select 1 from tickets t join order_items oi on oi.id = t.order_item_id
  where oi.order_id = ${orders.id} and t.status = 'redeemed'
)`;

/** Orden pagada, sin liquidar, con pago en Stripe y sin entradas canjeadas: reclamable por el reembolso. */
const claimable = and(
  eq(orders.status, "paid"),
  isNull(orders.settlementId),
  isNotNull(orders.stripePaymentIntentId),
  sql`not ${hasRedeemedTicket}`,
);

/** Orden ya reclamada (refunded) cuyo reembolso en Stripe aún no se registró. */
const stripePending = and(
  eq(orders.status, "refunded"),
  isNull(orders.stripeRefundId),
  isNotNull(orders.stripePaymentIntentId),
);

async function loadOrder(orderId: string) {
  const [row] = await db
    .select({
      id: orders.id,
      status: orders.status,
      totalAmount: orders.totalAmount,
      settlementId: orders.settlementId,
      stripePaymentIntentId: orders.stripePaymentIntentId,
      stripeRefundId: orders.stripeRefundId,
      eventId: orders.eventId,
      eventTitle: events.title,
      eventStatus: events.status,
      buyerEmail: users.email,
      redeemedTickets: sql<number>`(
        select count(*)::int from tickets t join order_items oi on oi.id = t.order_item_id
        where oi.order_id = ${orders.id} and t.status = 'redeemed'
      )`,
    })
    .from(orders)
    .innerJoin(events, eq(events.id, orders.eventId))
    .innerJoin(users, eq(users.id, orders.userId))
    .where(eq(orders.id, orderId))
    .limit(1);
  return row ?? null;
}

type LoadedOrder = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;

export async function getRefundPreview(
  actor: CurrentUser,
  orderId: string,
): Promise<{
  orderId: string;
  eventTitle: string;
  total: number;
  buyerEmail: string;
  refundable: boolean;
  reason?: string;
} | null> {
  requireAdmin(actor);
  const order = await loadOrder(orderId);
  if (!order) return null;
  const base = {
    orderId: order.id,
    eventTitle: order.eventTitle,
    total: order.totalAmount,
    buyerEmail: order.buyerEmail,
  };
  try {
    assertRefundable({
      status: order.status,
      hasPaymentIntent: order.stripePaymentIntentId !== null,
      settlementId: order.settlementId,
      redeemedTickets: order.redeemedTickets,
    });
    return { ...base, refundable: true };
  } catch (error) {
    if (error instanceof RefundRuleError) return { ...base, refundable: false, reason: error.message };
    throw error;
  }
}

/**
 * Paso (1) de AC-6: un solo batch (transacción) que reclama la orden (paid -> refunded), cancela sus entradas
 * y, si el evento sigue publicado, devuelve el inventario. Invariante: la primera sentencia bloquea la fila
 * de la orden (`for update`) y divide por cero (aborta todo el batch) si ya no está paid, fue liquidada o
 * tiene entradas canjeadas. Al mantener el bloqueo hasta el commit, una liquidación o un segundo reembolso
 * concurrente espera y, al reevaluar, ya no ve la orden `paid`: nunca se reembolsa y liquida el mismo pago,
 * ni se decrementa `quantity_sold` dos veces. `releaseSoldSql` solo actúa mientras la orden sigue `paid`,
 * por eso va antes del cambio de estado (la fila ya está bloqueada, así que no puede cambiar en medio).
 */
async function claimOrderForRefund(orderId: string, returnInventory: boolean): Promise<void> {
  const guard = sql`select 1 / (
    select count(*)::int from (
      select 1 from orders o
      where o.id = ${orderId} and o.status = 'paid' and o.settlement_id is null
        and not exists (
          select 1 from tickets t join order_items oi on oi.id = t.order_item_id
          where oi.order_id = o.id and t.status = 'redeemed'
        )
      for update of o
    ) locked
  )`;
  const statements: Statement[] = [db.execute(guard)];
  if (returnInventory) statements.push(db.execute(releaseSoldSql(orderId)));
  statements.push(
    db
      .update(tickets)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(tickets.status, "valid"),
          inArray(
            tickets.orderItemId,
            db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.orderId, orderId)),
          ),
        ),
      ),
    db
      .update(orders)
      .set({ status: "refunded", refundedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.status, "paid"), isNull(orders.settlementId))),
  );
  try {
    await db.batch(statements as [Statement, ...Statement[]]);
  } catch (error) {
    if (isDivisionByZero(error)) throw new RefundRuleError("La orden ya no es reembolsable");
    throw error;
  }
}

/**
 * Pasos (2)-(3) de AC-6. La clave de idempotencia es estable por orden: repetir el paso tras un fallo o una
 * caída devuelve el mismo reembolso y nunca crea otro. Un error de Stripe no revierte el reclamo (el
 * inventario ya volvió y el estado es consistente): la orden queda `refunded` sin `stripe_refund_id` y se
 * reintenta solo este paso. Se registra solo el código del error, nunca el payload.
 */
async function createStripeRefund(orderId: string, paymentIntentId: string): Promise<boolean> {
  try {
    const refund = await getStripe().refunds.create(
      {
        payment_intent: paymentIntentId,
        reason: "requested_by_customer",
        metadata: { orderId },
      },
      { idempotencyKey: `refund-order-${orderId}` },
    );
    await db
      .update(orders)
      .set({ stripeRefundId: refund.id, updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), isNull(orders.stripeRefundId)));
    return true;
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    console.error("refund.stripe_failed", { orderId, code: typeof code === "string" ? code : "unknown" });
    return false;
  }
}

async function refundLoadedOrder(order: LoadedOrder): Promise<"refunded" | "pending_stripe"> {
  if (order.status === "refunded" && order.stripeRefundId === null && order.stripePaymentIntentId) {
    const done = await createStripeRefund(order.id, order.stripePaymentIntentId);
    return done ? "refunded" : "pending_stripe";
  }
  assertRefundable({
    status: order.status,
    hasPaymentIntent: order.stripePaymentIntentId !== null,
    settlementId: order.settlementId,
    redeemedTickets: order.redeemedTickets,
  });
  await claimOrderForRefund(order.id, shouldReturnInventory(order.eventStatus));
  const done = await createStripeRefund(order.id, order.stripePaymentIntentId as string);
  return done ? "refunded" : "pending_stripe";
}

export async function refundOrder(
  actor: CurrentUser,
  orderId: string,
): Promise<{ status: "refunded" | "pending_stripe" }> {
  requireAdmin(actor);
  const order = await loadOrder(orderId);
  if (!order) throw new RefundRuleError(NOT_FOUND);
  return { status: await refundLoadedOrder(order) };
}

async function processOrders(orderIds: string[]): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;
  for (const id of orderIds) {
    try {
      const order = await loadOrder(id);
      const result = order ? await refundLoadedOrder(order) : "pending_stripe";
      if (result === "refunded") processed += 1;
      else failed += 1;
    } catch (error) {
      if (!(error instanceof RefundRuleError)) throw error;
      failed += 1;
    }
  }
  return { processed, failed };
}

async function countOrders(where: ReturnType<typeof and>): Promise<number> {
  const [row] = await db.select({ value: count() }).from(orders).where(where);
  return row?.value ?? 0;
}

/**
 * Reembolsa hasta `limit` (máx. REFUND_BATCH_SIZE) órdenes de un evento cancelado. Reanudable: primero las
 * órdenes `paid` (nuevas) y después las ya reclamadas sin reembolso en Stripe; las canjeadas o sin pago
 * quedan fuera de la selección y de `remaining` para no bloquear el avance. Cualquier liquidación del
 * evento, incluso `failed` (sus órdenes ya tienen `settlement_id`), bloquea el reembolso automático.
 */
export async function refundEventOrders(
  actor: CurrentUser,
  eventId: string,
  opts: { limit?: number } = {},
): Promise<BatchResult> {
  requireAdmin(actor);
  const [event] = await db
    .select({ status: events.status })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!event) throw new RefundRuleError("Evento no encontrado");
  if (event.status !== "cancelled") throw new RefundRuleError("El evento no está cancelado");
  const [settlement] = await db
    .select({ id: settlements.id })
    .from(settlements)
    .where(eq(settlements.eventId, eventId))
    .limit(1);
  if (settlement) throw new RefundRuleError("Evento ya liquidado; reversión manual");

  const where = and(eq(orders.eventId, eventId), or(claimable, stripePending));
  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(where)
    .orderBy(sql`${orders.status} = 'refunded'`, asc(orders.createdAt), asc(orders.id))
    .limit(clampRefundLimit(opts.limit));
  const { processed, failed } = await processOrders(rows.map((r) => r.id));
  return { processed, failed, remaining: await countOrders(where) };
}

export async function listCancelledEventsWithPaidOrders(actor: CurrentUser): Promise<CancelledEventRow[]> {
  requireAdmin(actor);
  return db
    .select({
      eventId: events.id,
      eventTitle: events.title,
      organizationName: organizations.name,
      paidOrders: sql<number>`count(${orders.id})::int`,
    })
    .from(events)
    .innerJoin(organizations, eq(events.organizationId, organizations.id))
    .innerJoin(
      orders,
      and(eq(orders.eventId, events.id), eq(orders.status, "paid"), isNull(orders.settlementId)),
    )
    .leftJoin(settlements, eq(settlements.eventId, events.id))
    .where(and(eq(events.status, "cancelled"), isNull(settlements.id)))
    .groupBy(events.id, events.title, events.startsAt, organizations.name)
    .orderBy(events.startsAt);
}

export async function countPendingRefunds(actor: CurrentUser): Promise<number> {
  requireAdmin(actor);
  return countOrders(stripePending);
}

/** Reintenta solo los pasos (2)-(3) de las órdenes `refunded` sin `stripe_refund_id` (todas las de la plataforma). */
export async function retryPendingRefunds(
  actor: CurrentUser,
  opts: { limit?: number } = {},
): Promise<BatchResult> {
  requireAdmin(actor);
  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(stripePending)
    .orderBy(asc(orders.refundedAt), asc(orders.id))
    .limit(clampRefundLimit(opts.limit));
  const { processed, failed } = await processOrders(rows.map((r) => r.id));
  return { processed, failed, remaining: await countOrders(stripePending) };
}

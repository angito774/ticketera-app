import { randomUUID } from "node:crypto";

import { and, eq, lt, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { db } from "@/db";
import { orderItems, orders, stripeEvents, ticketHolds, tickets } from "@/db/schema";
import {
  isCheckViolation,
  isDivisionByZero,
  isForeignKeyViolation,
  isUniqueViolation,
} from "@/lib/pg-errors";
import type { CurrentUser } from "@/modules/auth/services/current-user.service";
import {
  computeTotalCents,
  generateQrToken,
  type ResolvedZone,
} from "@/modules/checkout/services/purchase.mapping";
import {
  addSoldSql,
  buildPurchaseRows,
  buildTicketRows,
  claimSeatsSql,
  releaseHeldQuantitySql,
  releaseSeatsSql,
  reserveGeneralSql,
  type PricedItem,
} from "@/modules/checkout/services/purchase.query";
import {
  HOLD_GRACE_MINUTES,
  HOLD_TTL_MINUTES,
} from "@/modules/payments/services/checkout-session.mapping";
import { chunkRows } from "@/modules/organizer/services/event-seats";

type Statement = BatchItem<"pg">;

const SWEEP_LIMIT = 50;
const MINUTE_MS = 60_000;

export type ReleaseReason = "expired" | "superseded" | "payment_failed" | "late_payment";

const RELEASE_EVENT_TYPE: Record<ReleaseReason, string> = {
  expired: "checkout.session.expired",
  superseded: "checkout.session.expired",
  payment_failed: "checkout.session.async_payment_failed",
  late_payment: "checkout.session.completed",
};

/** `conflict`: asiento o cupo ya no disponible; `invalid`: referencia inexistente. */
export class ReservationError extends Error {
  constructor(readonly kind: "conflict" | "invalid") {
    super(kind === "conflict" ? "reservation conflict" : "reservation invalid");
    this.name = "ReservationError";
  }
}

function reservationStatements(
  actor: CurrentUser,
  eventId: string,
  resolved: ResolvedZone[],
  items: PricedItem[],
  orderId: string,
  expiresAt: Date,
): Statement[] {
  const rows = buildPurchaseRows({
    orderId,
    userId: actor.id,
    eventId,
    totalCents: computeTotalCents(items),
    items,
    expiresAt,
    newId: randomUUID,
  });
  const claims: Statement[] = [];
  const general: Statement[] = [];
  const numberedSold: Statement[] = [];
  items.forEach((item, index) => {
    if (resolved[index].seating === "numbered") {
      claims.push(db.execute(claimSeatsSql(item.eventSeatIds, { from: "available", to: "held" })));
      numberedSold.push(db.execute(addSoldSql(item.ticketTypeId, item.quantity)));
    } else {
      general.push(db.execute(reserveGeneralSql(item.ticketTypeId, item.quantity)));
    }
  });
  return [
    ...claims,
    ...general,
    ...numberedSold,
    db.insert(orders).values(rows.order),
    db.insert(orderItems).values(rows.orderItems),
    ...chunkRows(rows.holds).map((chunk) => db.insert(ticketHolds).values(chunk)),
  ];
}

/** Reserva atómica: orden pending, ítems, holds, asientos held y cupo sumado en un solo batch. */
export async function reserveOrder(args: {
  actor: CurrentUser;
  eventId: string;
  resolved: ResolvedZone[];
  items: PricedItem[];
  now?: Date;
}): Promise<{ orderId: string; expiresAt: Date }> {
  const now = args.now ?? new Date();
  await releaseStaleOrders({ eventId: args.eventId, now });

  const orderId = randomUUID();
  const expiresAt = new Date(now.getTime() + HOLD_TTL_MINUTES * MINUTE_MS);
  const statements = reservationStatements(
    args.actor,
    args.eventId,
    args.resolved,
    args.items,
    orderId,
    expiresAt,
  );
  try {
    await db.batch(statements as [Statement, ...Statement[]]);
  } catch (error) {
    if (isDivisionByZero(error) || isCheckViolation(error) || isUniqueViolation(error)) {
      throw new ReservationError("conflict");
    }
    if (isForeignKeyViolation(error)) throw new ReservationError("invalid");
    throw error;
  }
  return { orderId, expiresAt };
}

export async function attachCheckoutSession(orderId: string, sessionId: string): Promise<void> {
  await db.update(orders).set({ stripeCheckoutSessionId: sessionId }).where(eq(orders.id, orderId));
}

/**
 * Cancela una orden pending y libera su reserva (asientos, cupo y holds) en un batch. Idempotente: la
 * liberación se guía por los holds de la orden, que desaparecen al liberar. Con `stripeEventId` registra el
 * evento en el mismo batch; si ya estaba registrado devuelve "noop".
 */
export async function releaseOrder(
  orderId: string,
  reason: ReleaseReason,
  opts: { stripeEventId?: string } = {},
): Promise<"released" | "noop"> {
  const statements: Statement[] = [];
  if (opts.stripeEventId) {
    statements.push(
      db.insert(stripeEvents).values({ id: opts.stripeEventId, type: RELEASE_EVENT_TYPE[reason] }),
    );
  }
  statements.push(
    db.execute(releaseSeatsSql(orderId)),
    db.execute(releaseHeldQuantitySql(orderId)),
    db.delete(ticketHolds).where(eq(ticketHolds.orderId, orderId)),
    db
      .update(orders)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
      .returning({ id: orders.id }),
  );
  try {
    const results = await db.batch(statements as [Statement, ...Statement[]]);
    const cancelled = results[results.length - 1] as { id: string }[];
    return cancelled.length > 0 ? "released" : "noop";
  } catch (error) {
    if (opts.stripeEventId && isUniqueViolation(error)) return "noop";
    throw error;
  }
}

/** Pasa la orden a paid solo si sigue pending; si no, divide por cero y aborta el batch completo. */
function markPaidSql(orderId: string, paymentIntentId: string) {
  return sql`with upd as (
    update orders set status = 'paid', stripe_payment_intent_id = ${paymentIntentId}, updated_at = now()
    where id = ${orderId} and status = 'pending'
    returning id
  ) select 1 / (select count(*)::int from upd)`;
}

async function isEventRecorded(stripeEventId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: stripeEvents.id })
    .from(stripeEvents)
    .where(eq(stripeEvents.id, stripeEventId))
    .limit(1);
  return Boolean(row);
}

/**
 * Confirma el pago: orden pending -> paid, asientos held -> sold, entradas y borrado de holds, junto con el
 * registro del evento, en un batch. "duplicate": evento ya procesado; "not_pending": la orden ya no admite pago.
 */
export async function finalizePaidOrder(args: {
  orderId: string;
  paymentIntentId: string;
  stripeEventId: string;
}): Promise<"paid" | "duplicate" | "not_pending"> {
  const { orderId } = args;
  const [order] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order || order.status !== "pending") return "not_pending";

  const [items, holds] = await Promise.all([
    db
      .select({ id: orderItems.id, ticketTypeId: orderItems.ticketTypeId, quantity: orderItems.quantity })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId)),
    db
      .select({ ticketTypeId: ticketHolds.ticketTypeId, eventSeatId: ticketHolds.eventSeatId })
      .from(ticketHolds)
      .where(eq(ticketHolds.orderId, orderId)),
  ]);

  const seatIds: string[] = [];
  const seatsByType = new Map<string, string[]>();
  for (const hold of holds) {
    if (!hold.eventSeatId) continue;
    seatIds.push(hold.eventSeatId);
    seatsByType.set(hold.ticketTypeId, [...(seatsByType.get(hold.ticketTypeId) ?? []), hold.eventSeatId]);
  }
  const ticketRows = buildTicketRows({
    items: items.map((item) => ({
      orderItemId: item.id,
      ticketTypeId: item.ticketTypeId,
      quantity: item.quantity,
      eventSeatIds: seatsByType.get(item.ticketTypeId)?.splice(0, item.quantity) ?? [],
    })),
    newId: randomUUID,
    newToken: generateQrToken,
  });

  const statements: Statement[] = [
    db.insert(stripeEvents).values({ id: args.stripeEventId, type: "checkout.session.completed" }),
    db.execute(markPaidSql(orderId, args.paymentIntentId)),
    ...(seatIds.length > 0
      ? [db.execute(claimSeatsSql(seatIds, { from: "held", to: "sold" }))]
      : []),
    ...chunkRows(ticketRows).map((chunk) => db.insert(tickets).values(chunk)),
    db.delete(ticketHolds).where(eq(ticketHolds.orderId, orderId)),
  ];
  try {
    await db.batch(statements as [Statement, ...Statement[]]);
  } catch (error) {
    if (isDivisionByZero(error)) return "not_pending";
    if (isUniqueViolation(error) && (await isEventRecorded(args.stripeEventId))) return "duplicate";
    throw error;
  }
  return "paid";
}

export async function listPendingOrderIds(userId: string, eventId: string): Promise<string[]> {
  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.eventId, eventId), eq(orders.status, "pending")));
  return rows.map((row) => row.id);
}

/** Libera órdenes pending vencidas hace más de `HOLD_GRACE_MINUTES` (nunca antes: puede haber un pago en curso). */
export async function releaseStaleOrders(opts: { eventId?: string; now?: Date } = {}): Promise<number> {
  const now = opts.now ?? new Date();
  const cutoff = new Date(now.getTime() - HOLD_GRACE_MINUTES * MINUTE_MS);
  const stale = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.status, "pending"),
        lt(orders.expiresAt, cutoff),
        opts.eventId ? eq(orders.eventId, opts.eventId) : undefined,
      ),
    )
    .limit(SWEEP_LIMIT);
  let released = 0;
  for (const { id } of stale) {
    if ((await releaseOrder(id, "expired")) === "released") released += 1;
  }
  return released;
}

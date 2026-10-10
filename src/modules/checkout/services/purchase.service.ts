import { and, eq, gt, inArray, or } from "drizzle-orm";

import { db } from "@/db";
import { eventSeats, events, orders, ticketTypes, venueSeats, venueZones } from "@/db/schema";
import { getStripe } from "@/lib/stripe";
import type { CurrentUser } from "@/modules/auth/services/current-user.service";
import { getEventById } from "@/modules/events/services/events.service";
import type { PurchaseRequest } from "@/modules/checkout/schemas/purchase.schema";
import {
  PurchaseRuleError,
  computeTotalCents,
  resolveSelection,
  type ResolvedZone,
} from "@/modules/checkout/services/purchase.mapping";
import type { PricedItem } from "@/modules/checkout/services/purchase.query";
import {
  ReservationError,
  attachCheckoutSession,
  listPendingOrderIds,
  releaseOrder,
  reserveOrder,
} from "@/modules/checkout/services/reservation.service";
import {
  HOLD_TTL_MINUTES,
  buildCheckoutSessionParams,
} from "@/modules/payments/services/checkout-session.mapping";
import { getVenueLayout } from "@/modules/tickets/services/venues.service";

export class PurchaseError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 409 | 422 | 404 | 502,
  ) {
    super(message);
    this.name = "PurchaseError";
  }
}

const UNAVAILABLE = "Evento no disponible";
const INVALID_SELECTION = "Selección no válida";
const CONFLICT =
  "Ese asiento ya no está disponible o se agotó el cupo; actualiza tu selección";

async function loadEvent(slug: string) {
  const [event] = await db
    .select({ id: events.id, venueId: events.venueId, title: events.title })
    .from(events)
    .where(and(eq(events.slug, slug), eq(events.status, "published"), gt(events.startsAt, new Date())))
    .limit(1);
  const mock = getEventById(slug);
  if (!event || !mock) throw new PurchaseError(UNAVAILABLE, 404);
  return { event, layout: getVenueLayout(mock.layoutId, mock.price) };
}

function resolve(layout: ReturnType<typeof getVenueLayout>, request: PurchaseRequest): ResolvedZone[] {
  try {
    return resolveSelection(layout, request.selection);
  } catch (error) {
    if (error instanceof PurchaseRuleError) throw new PurchaseError(error.message, 422);
    throw error;
  }
}

/** Zonas y tipos de entrada del evento, con precios de la base. Devuelve los ítems con asientos de evento. */
async function priceItems(
  eventId: string,
  venueId: string,
  resolved: ResolvedZone[],
): Promise<PricedItem[]> {
  const zones = await db
    .select({ id: venueZones.id, name: venueZones.name })
    .from(venueZones)
    .where(
      and(
        eq(venueZones.venueId, venueId),
        inArray(
          venueZones.name,
          resolved.map((z) => z.zoneName),
        ),
      ),
    );
  const zoneIdByName = new Map<string, string>();
  for (const zone of zones) if (!zoneIdByName.has(zone.name)) zoneIdByName.set(zone.name, zone.id);

  const zoneIds = resolved.map((z) => zoneIdByName.get(z.zoneName));
  if (zoneIds.some((id) => !id)) throw new PurchaseError(INVALID_SELECTION, 422);

  const types = await db
    .select({ id: ticketTypes.id, zoneId: ticketTypes.venueZoneId, price: ticketTypes.price })
    .from(ticketTypes)
    .where(and(eq(ticketTypes.eventId, eventId), inArray(ticketTypes.venueZoneId, zoneIds as string[])));
  const typeByZone = new Map(types.map((t) => [t.zoneId, t]));

  const numbered = resolved.filter((z) => z.seating === "numbered");
  const seatKey = (zoneId: string, row: string, number: number) => `${zoneId}|${row}|${number}`;
  const seatIdByKey = new Map<string, string>();
  if (numbered.length > 0) {
    const pairs = numbered.flatMap((z) =>
      z.seats.map((s) =>
        and(
          eq(venueSeats.venueZoneId, zoneIdByName.get(z.zoneName) as string),
          eq(venueSeats.rowLabel, s.row),
          eq(venueSeats.seatNumber, s.number),
        ),
      ),
    );
    const rows = await db
      .select({
        id: eventSeats.id,
        zoneId: venueSeats.venueZoneId,
        row: venueSeats.rowLabel,
        number: venueSeats.seatNumber,
      })
      .from(eventSeats)
      .innerJoin(venueSeats, eq(venueSeats.id, eventSeats.venueSeatId))
      .where(and(eq(eventSeats.eventId, eventId), or(...pairs)));
    for (const r of rows) seatIdByKey.set(seatKey(r.zoneId, r.row, r.number), r.id);
  }

  return resolved.map((zone) => {
    const zoneId = zoneIdByName.get(zone.zoneName) as string;
    const type = typeByZone.get(zoneId);
    if (!type) throw new PurchaseError(INVALID_SELECTION, 422);
    const eventSeatIds = zone.seats.map((s) => {
      const id = seatIdByKey.get(seatKey(zoneId, s.row, s.number));
      if (!id) throw new PurchaseError(INVALID_SELECTION, 422);
      return id;
    });
    return {
      ticketTypeId: type.id,
      unitPriceCents: type.price,
      quantity: zone.quantity,
      eventSeatIds,
    };
  });
}

const PAYMENT_UNAVAILABLE = "No se pudo iniciar el pago; inténtalo de nuevo";

/** Libera los intentos pendientes propios del evento y expira su sesión de Stripe (mejor esfuerzo). */
async function supersedePendingOrders(actor: CurrentUser, eventId: string): Promise<void> {
  const pendingIds = await listPendingOrderIds(actor.id, eventId);
  for (const id of pendingIds) {
    const [row] = await db
      .select({ sessionId: orders.stripeCheckoutSessionId })
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);
    if ((await releaseOrder(id, "superseded")) === "released" && row?.sessionId) {
      await getStripe().checkout.sessions.expire(row.sessionId).catch(() => undefined);
    }
  }
}

async function createSession(
  orderId: string,
  actor: CurrentUser,
  event: { id: string; title: string },
  request: PurchaseRequest,
  resolved: ResolvedZone[],
  items: PricedItem[],
): Promise<string> {
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error("APP_URL is not set");
  const params = buildCheckoutSessionParams({
    orderId,
    eventId: event.id,
    eventSlug: request.eventSlug,
    eventTitle: event.title,
    buyerEmail: actor.email,
    appUrl,
    expiresAt: new Date(Date.now() + (HOLD_TTL_MINUTES + 1) * 60_000),
    items: items.map((item, index) => ({
      zoneName: resolved[index].zoneName,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
    })),
  });
  const session = await getStripe().checkout.sessions.create(params, {
    idempotencyKey: `checkout-${orderId}`,
  });
  if (!session.url) throw new Error("Stripe session has no url");
  await attachCheckoutSession(orderId, session.id);
  return session.url;
}

export async function purchaseTickets(
  actor: CurrentUser | null,
  request: PurchaseRequest,
): Promise<{ orderId: string; checkoutUrl: string }> {
  if (!actor) throw new PurchaseError("Inicia sesión para comprar", 401);

  const { event, layout } = await loadEvent(request.eventSlug);
  const resolved = resolve(layout, request);
  const items = await priceItems(event.id, event.venueId, resolved);
  if (!(computeTotalCents(items) > 0)) throw new PurchaseError(INVALID_SELECTION, 422);

  await supersedePendingOrders(actor, event.id);

  let orderId: string;
  try {
    ({ orderId } = await reserveOrder({ actor, eventId: event.id, resolved, items }));
  } catch (error) {
    if (error instanceof ReservationError) {
      throw new PurchaseError(error.kind === "conflict" ? CONFLICT : INVALID_SELECTION, error.kind === "conflict" ? 409 : 422);
    }
    throw error;
  }

  try {
    const checkoutUrl = await createSession(orderId, actor, event, request, resolved, items);
    return { orderId, checkoutUrl };
  } catch (error) {
    console.error("checkout session failed", { orderId, name: error instanceof Error ? error.name : "unknown" });
    await releaseOrder(orderId, "payment_failed").catch(() => undefined);
    throw new PurchaseError(PAYMENT_UNAVAILABLE, 502);
  }
}

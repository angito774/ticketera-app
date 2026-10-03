import { randomUUID } from "node:crypto";

import { and, eq, gt, inArray, or } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { db } from "@/db";
import {
  eventSeats,
  events,
  orderItems,
  orders,
  ticketTypes,
  tickets,
  venueSeats,
  venueZones,
} from "@/db/schema";
import {
  isCheckViolation,
  isDivisionByZero,
  isForeignKeyViolation,
  isUniqueViolation,
} from "@/lib/pg-errors";
import type { CurrentUser } from "@/modules/auth/services/current-user.service";
import { getEventById } from "@/modules/events/services/events.service";
import type { PurchaseRequest } from "@/modules/checkout/schemas/purchase.schema";
import {
  PurchaseRuleError,
  computeTotalCents,
  generateQrToken,
  orderNumberFromId,
  resolveSelection,
  type ResolvedZone,
} from "@/modules/checkout/services/purchase.mapping";
import {
  addSoldSql,
  buildPurchaseRows,
  claimSeatsSql,
  reserveGeneralSql,
  type PricedItem,
} from "@/modules/checkout/services/purchase.query";
import { chunkRows } from "@/modules/organizer/services/event-seats";
import { getVenueLayout } from "@/modules/tickets/services/venues.service";

type Statement = BatchItem<"pg">;

export class PurchaseError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 409 | 422 | 404,
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
    .select({ id: events.id, venueId: events.venueId })
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

function buildStatements(
  actor: CurrentUser,
  eventId: string,
  resolved: ResolvedZone[],
  items: PricedItem[],
  orderId: string,
): Statement[] {
  const rows = buildPurchaseRows({
    orderId,
    userId: actor.id,
    eventId,
    totalCents: computeTotalCents(items),
    items,
    newId: randomUUID,
    newToken: generateQrToken,
  });
  const claims: Statement[] = [];
  const general: Statement[] = [];
  const numberedSold: Statement[] = [];
  items.forEach((item, index) => {
    if (resolved[index].seating === "numbered") {
      claims.push(db.execute(claimSeatsSql(item.eventSeatIds)));
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
    ...chunkRows(rows.tickets).map((chunk) => db.insert(tickets).values(chunk)),
  ];
}

export async function purchaseTickets(
  actor: CurrentUser | null,
  request: PurchaseRequest,
): Promise<{ orderId: string; orderNumber: string }> {
  if (!actor) throw new PurchaseError("Inicia sesión para comprar", 401);

  const { event, layout } = await loadEvent(request.eventSlug);
  const resolved = resolve(layout, request);
  const items = await priceItems(event.id, event.venueId, resolved);

  const orderId = randomUUID();
  const statements = buildStatements(actor, event.id, resolved, items, orderId);
  try {
    await db.batch(statements as [Statement, ...Statement[]]);
  } catch (error) {
    if (isDivisionByZero(error) || isCheckViolation(error) || isUniqueViolation(error)) throw new PurchaseError(CONFLICT, 409);
    if (isForeignKeyViolation(error)) throw new PurchaseError(INVALID_SELECTION, 422);
    throw error;
  }
  return { orderId, orderNumber: orderNumberFromId(orderId) };
}

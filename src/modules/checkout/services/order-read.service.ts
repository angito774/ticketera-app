import { and, asc, desc, eq, inArray } from "drizzle-orm";

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
import type { CurrentUser } from "@/modules/auth/services/current-user.service";
import {
  buildOrderViews,
  isUuid,
  type OrderRow,
  type OrderView,
  type TicketRow,
} from "@/modules/checkout/services/order-read.mapping";
import { toLimaIso } from "@/modules/events/services/event-list.mapping";

export type { OrderTicketView, OrderView } from "@/modules/checkout/services/order-read.mapping";

const LISTED_STATUSES = ["paid", "refunded"] as const;

function selectOrders(actor: CurrentUser, orderId?: string) {
  return db
    .select({
      id: orders.id,
      eventSlug: events.slug,
      eventTitle: events.title,
      createdAt: orders.createdAt,
      totalAmountCents: orders.totalAmount,
      status: orders.status,
    })
    .from(orders)
    .innerJoin(events, eq(orders.eventId, events.id))
    .where(
      and(
        eq(orders.userId, actor.id),
        orderId ? eq(orders.id, orderId) : inArray(orders.status, [...LISTED_STATUSES]),
      ),
    )
    .orderBy(desc(orders.createdAt), asc(orders.id));
}

async function loadTickets(orderIds: string[]): Promise<TicketRow[]> {
  if (orderIds.length === 0) return [];
  return db
    .select({
      id: tickets.id,
      orderId: orderItems.orderId,
      zoneName: venueZones.name,
      rowLabel: venueSeats.rowLabel,
      seatNumber: venueSeats.seatNumber,
      qrCode: tickets.qrCode,
      status: tickets.status,
    })
    .from(tickets)
    .innerJoin(orderItems, eq(tickets.orderItemId, orderItems.id))
    .innerJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id))
    .innerJoin(venueZones, eq(ticketTypes.venueZoneId, venueZones.id))
    .leftJoin(eventSeats, eq(tickets.eventSeatId, eventSeats.id))
    .leftJoin(venueSeats, eq(eventSeats.venueSeatId, venueSeats.id))
    .where(inArray(orderItems.orderId, orderIds))
    .orderBy(
      asc(venueZones.name),
      asc(venueSeats.rowLabel),
      asc(venueSeats.seatNumber),
      asc(tickets.id)
    );
}

function buyerOf(actor: CurrentUser) {
  return { name: actor.fullName?.trim() || actor.email, email: actor.email };
}

async function toViews(actor: CurrentUser, rows: OrderRow[]): Promise<OrderView[]> {
  const ticketRows = await loadTickets(rows.map((row) => row.id));
  return buildOrderViews(rows, ticketRows, buyerOf(actor), toLimaIso);
}

/** null si el id no es uuid, no existe o no pertenece al actor (404 uniforme). */
export async function getOrderForUser(
  actor: CurrentUser,
  orderId: string
): Promise<OrderView | null> {
  if (!isUuid(orderId)) return null;
  const rows = await selectOrders(actor, orderId).limit(1);
  const views = await toViews(actor, rows);
  return views[0] ?? null;
}

export async function listOrdersForUser(actor: CurrentUser): Promise<OrderView[]> {
  return toViews(actor, await selectOrders(actor));
}

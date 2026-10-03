import { orderNumberFromId } from "@/modules/checkout/services/purchase.mapping";
import type { VenueLayout } from "@/modules/tickets/types/venue.types";

export type OrderStatusView = "paid" | "pending" | "cancelled" | "refunded";
export type TicketStatusView = "valid" | "redeemed" | "cancelled";

export interface OrderTicketView {
  id: string;
  zoneName: string;
  seatLabel: string | null;
  qrCode: string;
  status: TicketStatusView;
}

export interface OrderView {
  id: string;
  number: string;
  eventSlug: string;
  eventTitle: string;
  createdAt: string;
  total: number;
  status: OrderStatusView;
  buyerName: string;
  buyerEmail: string;
  tickets: OrderTicketView[];
}

export interface OrderRow {
  id: string;
  eventSlug: string;
  eventTitle: string;
  createdAt: Date;
  totalAmountCents: number;
  status: OrderStatusView;
}

export interface TicketRow {
  id: string;
  orderId: string;
  zoneName: string;
  rowLabel: string | null;
  seatNumber: number | null;
  qrCode: string;
  status: TicketStatusView;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function seatLabelOf(rowLabel: string | null, seatNumber: number | null): string | null {
  if (rowLabel === null || seatNumber === null) return null;
  return `Fila ${rowLabel} · Asiento ${seatNumber}`;
}

export function buildOrderViews(
  orders: OrderRow[],
  tickets: TicketRow[],
  buyer: { name: string; email: string },
  toIso: (date: Date) => string
): OrderView[] {
  const byOrder = new Map<string, OrderTicketView[]>();
  for (const ticket of tickets) {
    const list = byOrder.get(ticket.orderId) ?? [];
    list.push({
      id: ticket.id,
      zoneName: ticket.zoneName,
      seatLabel: seatLabelOf(ticket.rowLabel, ticket.seatNumber),
      qrCode: ticket.qrCode,
      status: ticket.status,
    });
    byOrder.set(ticket.orderId, list);
  }

  return orders.map((order) => ({
    id: order.id,
    number: orderNumberFromId(order.id),
    eventSlug: order.eventSlug,
    eventTitle: order.eventTitle,
    createdAt: toIso(order.createdAt),
    total: order.totalAmountCents / 100,
    status: order.status,
    buyerName: buyer.name,
    buyerEmail: buyer.email,
    tickets: byOrder.get(order.id) ?? [],
  }));
}

export interface SoldSeatRow {
  zoneName: string;
  rowLabel: string;
  seatNumber: number;
}

export interface TicketTypeRow {
  zoneName: string;
  quantityTotal: number | null;
  quantitySold: number;
}

/** Zona por nombre + fila + número → id de asiento del layout; lo que no existe en el layout se ignora. */
export function mapSoldSeatIds(layout: VenueLayout, sold: SoldSeatRow[]): string[] {
  const idByKey = new Map<string, string>();
  for (const zone of layout.zones) {
    for (const row of zone.rows) {
      for (const seat of row.seats) {
        idByKey.set(`${zone.name}|${row.label}|${seat.number}`, seat.id);
      }
    }
  }
  const ids = new Set<string>();
  for (const seat of sold) {
    const id = idByKey.get(`${seat.zoneName}|${seat.rowLabel}|${seat.seatNumber}`);
    if (id) ids.add(id);
  }
  return [...ids];
}

/** Zona numerada o sin tope: null. Zona general sin ticket type (no vendible): 0. */
export function mapRemainingByZone(
  layout: VenueLayout,
  types: TicketTypeRow[]
): Record<string, number | null> {
  const byName = new Map(types.map((type) => [type.zoneName, type]));
  const remaining: Record<string, number | null> = {};
  for (const zone of layout.zones) {
    if (zone.seating === "numbered") {
      remaining[zone.id] = null;
      continue;
    }
    const type = byName.get(zone.name);
    remaining[zone.id] =
      !type ? 0 : type.quantityTotal === null ? null : Math.max(type.quantityTotal - type.quantitySold, 0);
  }
  return remaining;
}

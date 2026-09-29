import { DEMO_ACCOUNT, normalizeEmail } from "@/modules/account/services/auth.service";
import { createOrder } from "@/modules/checkout/services/orders.service";
import type { Order } from "@/modules/checkout/types/order.types";
import { getEventById } from "@/modules/events/services/events.service";
import type { EventDetail } from "@/modules/events/types/event.types";
import { getVenueLayout } from "@/modules/tickets/services/venues.service";
import type { PurchaseSelection } from "@/modules/tickets/store/purchase.store";

function demoOrder(eventId: string, number: number, selection: (event: EventDetail) => PurchaseSelection): Order {
  const event = getEventById(eventId)!;
  const layout = getVenueLayout(event.layoutId, event.price);
  const order = createOrder({
    eventId,
    layout,
    selection: selection(event),
    buyer: { fullName: DEMO_ACCOUNT.user.name, email: DEMO_ACCOUNT.user.email, paymentMethod: "card" },
    now: new Date("2026-09-20T15:00:00Z"),
    random: () => (number - 10000) / 90000,
  });
  return order;
}

/** Pedidos de ejemplo de la cuenta demo (datos mock). */
export const DEMO_ORDERS: Order[] = [
  demoOrder("concert-01", 24817, () => ({ quantities: { general: 2 }, seats: {} })),
  demoOrder("theater-01", 24790, (event) => {
    // Primer asiento libre de la Platea: el layout es determinístico.
    const platea = getVenueLayout(event.layoutId, event.price).zones.find((zone) => zone.id === "platea")!;
    const seat = platea.rows.flatMap((row) => row.seats).find((item) => item.status === "available")!;
    return { quantities: {}, seats: { platea: [seat.id] } };
  }),
];

function eventTime(order: Order): number {
  const event = getEventById(order.eventId);
  return event ? new Date(event.date).getTime() : Number.POSITIVE_INFINITY;
}

/**
 * Pedidos de un usuario: los guardados en el navegador con su correo de comprador,
 * más los de ejemplo si es la cuenta demo. Sin duplicados y por fecha del evento.
 */
export function getOrdersForUser(email: string, storedOrders: Order[]): Order[] {
  const normalized = normalizeEmail(email);
  const own = storedOrders.filter((order) => normalizeEmail(order.buyerEmail) === normalized);
  const seeds = normalized === DEMO_ACCOUNT.user.email ? DEMO_ORDERS : [];

  const byNumber = new Map<string, Order>();
  [...own, ...seeds].forEach((order) => {
    if (!byNumber.has(order.number)) byNumber.set(order.number, order);
  });
  return [...byNumber.values()].sort((a, b) => eventTime(a) - eventTime(b));
}

/** Separa los pedidos en próximos y pasados según la fecha del evento. */
export function splitOrdersByDate(orders: Order[], now: Date = new Date()): { upcoming: Order[]; past: Order[] } {
  const upcoming: Order[] = [];
  const past: Order[] = [];
  orders.forEach((order) => (eventTime(order) >= now.getTime() ? upcoming : past).push(order));
  return { upcoming, past: past.reverse() };
}

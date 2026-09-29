import type { CheckoutFormValues } from "@/modules/checkout/schemas/checkout.schema";
import type { Order, OrderTicket } from "@/modules/checkout/types/order.types";
import {
  buildPurchaseSummary,
  type PurchaseSelection,
} from "@/modules/tickets/store/purchase.store";
import type { VenueLayout } from "@/modules/tickets/types/venue.types";

interface CreateOrderInput {
  eventId: string;
  layout: VenueLayout;
  selection: PurchaseSelection;
  buyer: Pick<CheckoutFormValues, "fullName" | "email" | "paymentMethod">;
  /** Inyectables para tests. */
  now?: Date;
  random?: () => number;
}

function buildTickets(layout: VenueLayout, selection: PurchaseSelection): OrderTicket[] {
  return layout.zones.flatMap((zone): OrderTicket[] => {
    if (zone.seating === "numbered") {
      const seatIds = selection.seats[zone.id] ?? [];
      return zone.rows.flatMap((row) =>
        row.seats
          .filter((seat) => seatIds.includes(seat.id))
          .map((seat) => ({
            id: seat.id,
            zoneName: zone.name,
            seatLabel: `Fila ${row.label} · Asiento ${seat.number}`,
          }))
      );
    }
    const quantity = selection.quantities[zone.id] ?? 0;
    return Array.from({ length: quantity }, (_, index) => ({
      id: `${zone.id}-${index + 1}`,
      zoneName: zone.name,
      seatLabel: null,
    }));
  });
}

/** Arma el pedido mock de una compra: una entrada por unidad y totales de `buildPurchaseSummary`. */
export function createOrder({
  eventId,
  layout,
  selection,
  buyer,
  now = new Date(),
  random = Math.random,
}: CreateOrderInput): Order {
  const summary = buildPurchaseSummary(layout, selection);
  const number = `TK-${10000 + Math.floor(random() * 90000)}`;

  return {
    number,
    eventId,
    buyerName: buyer.fullName.trim(),
    buyerEmail: buyer.email.trim(),
    paymentMethod: buyer.paymentMethod,
    lines: summary.lines,
    ticketCount: summary.ticketCount,
    total: summary.total,
    tickets: buildTickets(layout, selection),
    createdAt: now.toISOString(),
  };
}

/** Código de cada entrada del pedido: "TK-24817-01". */
export function getTicketCode(order: Order, index: number): string {
  return `${order.number}-${String(index + 1).padStart(2, "0")}`;
}

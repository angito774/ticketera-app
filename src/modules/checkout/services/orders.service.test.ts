import { describe, expect, it } from "vitest";

import { createOrder, getTicketCode } from "@/modules/checkout/services/orders.service";
import { getVenueLayout } from "@/modules/tickets/services/venues.service";
import { buildPurchaseSummary } from "@/modules/tickets/store/purchase.store";

const layout = getVenueLayout("stadium", 250);
const oriente = layout.zones.find((zone) => zone.id === "oriente")!;
const seats = oriente.rows[1].seats.filter((seat) => seat.status === "available").slice(0, 2);
const selection = {
  quantities: { general: 2 },
  seats: { oriente: seats.map((seat) => seat.id) },
};

const order = createOrder({
  eventId: "concert-01",
  layout,
  selection,
  buyer: { fullName: "  Ana Quispe ", email: "ana@correo.pe", paymentMethod: "card" },
  now: new Date("2026-09-29T17:00:00Z"),
  random: () => 0.14817,
});

describe("createOrder", () => {
  it("creates a TK- order number with 5 digits", () => {
    expect(order.number).toBe("TK-23335");
    expect(order.number).toMatch(/^TK-\d{5}$/);
  });

  it("keeps the totals of buildPurchaseSummary", () => {
    const summary = buildPurchaseSummary(layout, selection);
    expect(order.lines).toEqual(summary.lines);
    expect(order.ticketCount).toBe(4);
    expect(order.total).toBe(summary.total);
  });

  it("creates one ticket per unit, with seat labels for numbered zones", () => {
    expect(order.tickets).toEqual([
      { id: "general-1", zoneName: "Campo General", seatLabel: null },
      { id: "general-2", zoneName: "Campo General", seatLabel: null },
      ...seats.map((seat) => ({
        id: seat.id,
        zoneName: "Tribuna Oriente",
        seatLabel: `Fila B · Asiento ${seat.number}`,
      })),
    ]);
  });

  it("stores trimmed buyer data and no card data", () => {
    expect(order).toMatchObject({
      eventId: "concert-01",
      buyerName: "Ana Quispe",
      buyerEmail: "ana@correo.pe",
      paymentMethod: "card",
      createdAt: "2026-09-29T17:00:00.000Z",
    });
    expect(JSON.stringify(order)).not.toMatch(/card\.|number":"4|cvv|expiry/);
  });
});

describe("getTicketCode", () => {
  it("appends the two-digit ticket position to the order number", () => {
    expect(getTicketCode(order, 0)).toBe("TK-23335-01");
    expect(getTicketCode(order, 3)).toBe("TK-23335-04");
  });
});

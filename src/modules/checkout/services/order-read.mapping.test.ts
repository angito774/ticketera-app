import { describe, expect, it } from "vitest";

import {
  buildOrderViews,
  getRefundView,
  isUuid,
  mapRemainingByZone,
  mapSoldSeatIds,
  seatLabelOf,
  shortTicketCode,
} from "@/modules/checkout/services/order-read.mapping";
import { getVenueLayout } from "@/modules/tickets/services/venues.service";

describe("isUuid", () => {
  it("acepta uuid y rechaza otros valores", () => {
    expect(isUuid("3f2b8c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f")).toBe(true);
    expect(isUuid("abc")).toBe(false);
    expect(isUuid("")).toBe(false);
  });
});

describe("seatLabelOf", () => {
  it("formatea fila y asiento, o null sin asiento", () => {
    expect(seatLabelOf("B", 7)).toBe("Fila B · Asiento 7");
    expect(seatLabelOf(null, null)).toBeNull();
  });
});

describe("buildOrderViews", () => {
  it("agrupa tickets por orden y arma número y total", () => {
    const views = buildOrderViews(
      [
        {
          id: "3f2b8c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f",
          eventSlug: "concert-01",
          eventTitle: "Show",
          eventStatus: "cancelled",
          eventCancellationReason: "venue",
          createdAt: new Date("2026-10-01T12:00:00Z"),
          totalAmountCents: 12550,
          status: "paid",
          stripeRefundId: null,
          refundedAt: null,
        },
      ],
      [
        { id: "t1", orderId: "3f2b8c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f", zoneName: "Platea", rowLabel: "B", seatNumber: 7, qrCode: "qr", status: "valid" },
        { id: "t2", orderId: "otra", zoneName: "Campo", rowLabel: null, seatNumber: null, qrCode: "qr2", status: "valid" },
      ],
      { name: "Ana", email: "ana@x.com" },
      (d) => d.toISOString()
    );
    expect(views).toHaveLength(1);
    expect(views[0].number).toBe("TK-3F2B8C1E");
    expect(views[0].total).toBe(125.5);
    expect(views[0].tickets).toEqual([
      { id: "t1", zoneName: "Platea", seatLabel: "Fila B · Asiento 7", qrCode: "qr", status: "valid" },
    ]);
    expect(views[0].buyerEmail).toBe("ana@x.com");
    expect(views[0].eventStatus).toBe("cancelled");
    expect(views[0].eventCancellationReason).toBe("venue");
    expect(views[0].refundState).toBe("in_progress");
    expect(views[0].refundedAt).toBeNull();
  });

  it("propaga refundState completed y refundedAt en ISO", () => {
    const [view] = buildOrderViews(
      [
        {
          id: "3f2b8c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f",
          eventSlug: "concert-01",
          eventTitle: "Show",
          eventStatus: "cancelled",
          eventCancellationReason: null,
          createdAt: new Date("2026-10-01T12:00:00Z"),
          totalAmountCents: 1000,
          status: "refunded",
          stripeRefundId: "re_1",
          refundedAt: new Date("2026-10-05T10:00:00Z"),
        },
      ],
      [],
      { name: "Ana", email: "ana@x.com" },
      (d) => d.toISOString()
    );
    expect(view.refundState).toBe("completed");
    expect(view.refundedAt).toBe("2026-10-05T10:00:00.000Z");
    expect(view.eventCancellationReason).toBeNull();
  });
});

describe("getRefundView", () => {
  it("paid con evento cancelado: in_progress", () => {
    expect(getRefundView({ orderStatus: "paid", eventStatus: "cancelled", hasStripeRefund: false })).toBe("in_progress");
  });

  it("refunded sin reembolso Stripe: in_progress; con reembolso: completed", () => {
    expect(getRefundView({ orderStatus: "refunded", eventStatus: "cancelled", hasStripeRefund: false })).toBe("in_progress");
    expect(getRefundView({ orderStatus: "refunded", eventStatus: "cancelled", hasStripeRefund: true })).toBe("completed");
  });

  it("resto de combinaciones: none", () => {
    expect(getRefundView({ orderStatus: "paid", eventStatus: "published", hasStripeRefund: false })).toBe("none");
    expect(getRefundView({ orderStatus: "paid", eventStatus: "draft", hasStripeRefund: false })).toBe("none");
    expect(getRefundView({ orderStatus: "pending", eventStatus: "cancelled", hasStripeRefund: false })).toBe("none");
    expect(getRefundView({ orderStatus: "cancelled", eventStatus: "cancelled", hasStripeRefund: false })).toBe("none");
  });
});

describe("shortTicketCode", () => {
  it("quita guiones, recorta a 8 caracteres y pasa a mayúsculas", () => {
    expect(shortTicketCode("ab-cd_efghijkl")).toBe("ABCD_EFG");
    expect(shortTicketCode("abc")).toBe("ABC");
  });
});

describe("mapSoldSeatIds", () => {
  const layout = getVenueLayout("theater", 100);

  it("mapea zona por nombre, fila y número al id del layout", () => {
    expect(
      mapSoldSeatIds(layout, [
        { zoneName: "Platea", rowLabel: "D", seatNumber: 3 },
        { zoneName: "Platea", rowLabel: "D", seatNumber: 3 },
        { zoneName: "Inexistente", rowLabel: "A", seatNumber: 1 },
      ])
    ).toEqual(["platea-D-3"]);
  });
});

describe("mapRemainingByZone", () => {
  const layout = getVenueLayout("stadium", 100);

  it("calcula cupo en generales y null en numeradas o sin tope", () => {
    const remaining = mapRemainingByZone(layout, [
      { zoneName: "Campo General", quantityTotal: 100, quantitySold: 30 },
      { zoneName: "Tribuna Norte", quantityTotal: null, quantitySold: 5 },
      { zoneName: "Tribuna Oriente", quantityTotal: null, quantitySold: 5 },
    ]);
    expect(remaining.general).toBe(70);
    expect(remaining.norte).toBeNull();
    expect(remaining.oriente).toBeNull();
    expect(remaining.vip).toBe(0);
  });
});

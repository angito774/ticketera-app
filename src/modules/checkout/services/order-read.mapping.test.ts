import { describe, expect, it } from "vitest";

import {
  buildOrderViews,
  isUuid,
  mapRemainingByZone,
  mapSoldSeatIds,
  seatLabelOf,
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
          createdAt: new Date("2026-10-01T12:00:00Z"),
          totalAmountCents: 12550,
          status: "paid",
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

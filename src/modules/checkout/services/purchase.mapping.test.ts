import { describe, expect, it } from "vitest";

import {
  PurchaseRuleError,
  computeTotalCents,
  generateQrToken,
  orderNumberFromId,
  resolveSelection,
} from "@/modules/checkout/services/purchase.mapping";
import { getVenueLayout } from "@/modules/tickets/services/venues.service";

const layout = getVenueLayout("stadium", 250);
const oriente = layout.zones.find((zone) => zone.id === "oriente")!;
const [seatA, seatB] = oriente.rows[0].seats;

describe("resolveSelection", () => {
  it("resuelve zonas generales y numeradas en el orden del layout", () => {
    const result = resolveSelection(layout, {
      quantities: { norte: 3, general: 0 },
      seats: { oriente: [seatB.id, seatA.id] },
    });
    expect(result.map((zone) => zone.zoneKey)).toEqual(["oriente", "norte"]);
    expect(result[0]).toMatchObject({
      zoneName: "Tribuna Oriente",
      seating: "numbered",
      quantity: 2,
      seats: [
        { seatId: seatB.id, row: "A", number: seatB.number },
        { seatId: seatA.id, row: "A", number: seatA.number },
      ],
    });
    expect(result[1]).toMatchObject({ seating: "general", quantity: 3, seats: [] });
  });

  it("ignora zonas con cantidad 0 o sin asientos", () => {
    const result = resolveSelection(layout, {
      quantities: { general: 0, norte: 1 },
      seats: { oriente: [] },
    });
    expect(result.map((zone) => zone.zoneKey)).toEqual(["norte"]);
  });

  const invalid: [string, Parameters<typeof resolveSelection>[1]][] = [
    ["selección vacía", { quantities: {}, seats: {} }],
    ["solo ceros", { quantities: { norte: 0 }, seats: {} }],
    ["zona inexistente", { quantities: { fantasma: 1 }, seats: {} }],
    ["asiento inexistente", { quantities: {}, seats: { oriente: ["oriente-Z-99"] } }],
    ["asiento de otra zona", { quantities: {}, seats: { oriente: ["occidente-A-1"] } }],
    ["asientos duplicados", { quantities: {}, seats: { oriente: [seatA.id, seatA.id] } }],
    ["más del máximo (general)", { quantities: { norte: 7 }, seats: {} }],
    ["más del máximo (numerada)", {
      quantities: {},
      seats: { oriente: oriente.rows[0].seats.slice(0, 7).map((seat) => seat.id) },
    }],
    ["cantidad no entera", { quantities: { norte: 1.5 }, seats: {} }],
    ["cantidad negativa", { quantities: { norte: -1 }, seats: {} }],
    ["asientos en zona general", { quantities: {}, seats: { norte: ["norte-A-1"] } }],
    ["cantidad en zona numerada", { quantities: { oriente: 2 }, seats: {} }],
  ];

  it.each(invalid)("lanza PurchaseRuleError: %s", (_name, selection) => {
    expect(() => resolveSelection(layout, selection)).toThrow(PurchaseRuleError);
  });
});

describe("computeTotalCents", () => {
  it("suma cantidad por precio unitario", () => {
    expect(
      computeTotalCents([
        { unitPriceCents: 12050, quantity: 2 },
        { unitPriceCents: 5000, quantity: 3 },
      ])
    ).toBe(39100);
    expect(computeTotalCents([])).toBe(0);
  });
});

describe("generateQrToken", () => {
  it("genera tokens base64url de 24 caracteres y únicos", () => {
    const tokens = Array.from({ length: 500 }, generateQrToken);
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{24}$/);
    expect(new Set(tokens).size).toBe(tokens.length);
  });
});

describe("orderNumberFromId", () => {
  it("usa los primeros 8 hex del uuid en mayúsculas", () => {
    expect(orderNumberFromId("3f2a9c1b-7d4e-4a8b-9c0d-1e2f3a4b5c6d")).toBe("TK-3F2A9C1B");
  });
});

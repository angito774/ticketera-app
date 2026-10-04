import { describe, expect, it } from "vitest";

import {
  buildTierValues,
  centavosToPriceString,
  toLimaDateTimeParts,
} from "@/modules/organizer/services/event-edit.mapping";

describe("toLimaDateTimeParts", () => {
  it("convierte UTC a hora de Lima (UTC-5)", () => {
    expect(toLimaDateTimeParts(new Date("2026-11-15T01:30:00Z"))).toEqual({
      date: "2026-11-14",
      time: "20:30",
    });
  });

  it("usa 00:00 y no 24:00 a medianoche", () => {
    expect(toLimaDateTimeParts(new Date("2026-11-15T05:00:00Z"))).toEqual({
      date: "2026-11-15",
      time: "00:00",
    });
  });
});

describe("centavosToPriceString", () => {
  it.each([
    [15000, "150"],
    [15050, "150.5"],
    [15005, "150.05"],
    [0, "0"],
    [5, "0.05"],
    [99, "0.99"],
    [15000.4, "150"],
  ])("%s -> %s", (cents, expected) => {
    expect(centavosToPriceString(cents)).toBe(expected);
  });
});

describe("buildTierValues", () => {
  it("devuelve un tier por zona en el orden de las zonas", () => {
    const tiers = buildTierValues(
      [{ id: "z1" }, { id: "z2" }, { id: "z3" }],
      [
        { venueZoneId: "z3", price: 5000, quantityTotal: 100 },
        { venueZoneId: "z1", price: 15050, quantityTotal: null },
      ],
    );
    expect(tiers).toEqual([
      { zoneId: "z1", enabled: true, price: "150.5", quantity: "" },
      { zoneId: "z2", enabled: false, price: "", quantity: "" },
      { zoneId: "z3", enabled: true, price: "50", quantity: "100" },
    ]);
  });
});

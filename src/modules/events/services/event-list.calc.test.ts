import { describe, expect, it } from "vitest";

import {
  centavosToSoles,
  computeEventTotals,
  mapTierCapacity,
} from "@/modules/events/services/event-list.calc";

describe("centavosToSoles", () => {
  it("convierte centavos a soles", () => {
    expect(centavosToSoles(15050)).toBe(150.5);
    expect(centavosToSoles(0)).toBe(0);
  });
});

describe("computeEventTotals", () => {
  it("sin tiers devuelve ceros y fromPrice null", () => {
    expect(computeEventTotals([])).toEqual({ sold: 0, capacity: 0, revenue: 0, fromPrice: null });
  });

  it("suma vendidas, capacidad e ingresos", () => {
    const totals = computeEventTotals([
      { priceCents: 10000, quantity: 100, sold: 10 },
      { priceCents: 25050, quantity: 50, sold: 2 },
    ]);
    expect(totals).toEqual({ sold: 12, capacity: 150, revenue: 1501, fromPrice: 100 });
  });

  it("ignora precios 0 para fromPrice pero los cuenta en vendidas", () => {
    const totals = computeEventTotals([
      { priceCents: 0, quantity: 20, sold: 5 },
      { priceCents: 8000, quantity: 10, sold: 1 },
    ]);
    expect(totals).toMatchObject({ sold: 6, revenue: 80, fromPrice: 80 });
    expect(computeEventTotals([{ priceCents: 0, quantity: 5, sold: 5 }]).fromPrice).toBeNull();
  });

  it("no pierde precisión con números grandes", () => {
    const totals = computeEventTotals([{ priceCents: 1999999, quantity: 1_000_000, sold: 1_000_000 }]);
    expect(totals.revenue).toBe(19_999_990_000);
  });
});

describe("mapTierCapacity", () => {
  it("usa quantityTotal y, si es null, la cantidad de asientos", () => {
    expect(mapTierCapacity(100, 30)).toBe(100);
    expect(mapTierCapacity(0, 30)).toBe(0);
    expect(mapTierCapacity(null, 30)).toBe(30);
  });
});

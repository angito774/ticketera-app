import { describe, expect, it } from "vitest";

import {
  addDaysIso,
  averageTicketCents,
  buildZoneSlices,
  computeDelta,
  computeOccupancy,
  fillDailySeries,
  limaDayStart,
  resolvePeriods,
} from "./dashboard.mapping";

describe("addDaysIso / limaDayStart", () => {
  it("cruza límites de mes y año", () => {
    expect(addDaysIso("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDaysIso("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDaysIso("2025-12-31", 1)).toBe("2026-01-01");
  });

  it("la medianoche Lima es 05:00 UTC", () => {
    expect(limaDayStart("2026-10-12").toISOString()).toBe("2026-10-12T05:00:00.000Z");
  });
});

describe("resolvePeriods", () => {
  it("devuelve N días incluyendo hoy y N previos sin solapamiento ni huecos", () => {
    const p = resolvePeriods(7, new Date("2026-10-12T15:00:00Z"));
    expect(p.current).toEqual({ from: "2026-10-06", to: "2026-10-12" });
    expect(p.previous).toEqual({ from: "2026-09-29", to: "2026-10-05" });
    expect(addDaysIso(p.previous.to, 1)).toBe(p.current.from);
  });

  it("cruza el límite de mes", () => {
    const p = resolvePeriods(30, new Date("2026-03-05T15:00:00Z"));
    expect(p.current).toEqual({ from: "2026-02-04", to: "2026-03-05" });
    expect(p.previous).toEqual({ from: "2026-01-05", to: "2026-02-03" });
  });

  it("cruza el límite de año", () => {
    const p = resolvePeriods(90, new Date("2026-01-10T15:00:00Z"));
    expect(p.current).toEqual({ from: "2025-10-13", to: "2026-01-10" });
    expect(p.previous.to).toBe("2025-10-12");
    expect(p.previous.from).toBe("2025-07-15");
  });

  it("a las 23:30 Lima sigue siendo el día de Lima aunque en UTC sea el siguiente", () => {
    const p = resolvePeriods(7, new Date("2026-10-13T04:30:00Z"));
    expect(p.current.to).toBe("2026-10-12");
  });
});

describe("computeDelta", () => {
  it("calcula la variación porcentual", () => {
    expect(computeDelta(150, 100)).toBe(50);
  });

  it("devuelve null con previo 0 (incluye 0 → 0) o nulo", () => {
    expect(computeDelta(10, 0)).toBeNull();
    expect(computeDelta(0, 0)).toBeNull();
    expect(computeDelta(10, null)).toBeNull();
    expect(computeDelta(null, 10)).toBeNull();
  });

  it("caída total es -100", () => {
    expect(computeDelta(0, 80)).toBe(-100);
  });
});

describe("fillDailySeries", () => {
  const periods = resolvePeriods(7, new Date("2026-10-12T15:00:00Z"));

  it("devuelve N puntos, rellena con 0 y empareja el día homólogo previo", () => {
    const series = fillDailySeries(
      [
        { date: "2026-10-07", revenueCents: 5000, tickets: 2 },
        { date: "2026-09-30", revenueCents: 3000, tickets: 1 },
      ],
      periods,
    );
    expect(series).toHaveLength(7);
    expect(series[0]).toEqual({
      date: "2026-10-06",
      revenueCents: 0,
      tickets: 0,
      prevRevenueCents: 0,
      prevTickets: 0,
    });
    expect(series[1]).toEqual({
      date: "2026-10-07",
      revenueCents: 5000,
      tickets: 2,
      prevRevenueCents: 3000,
      prevTickets: 1,
    });
    expect(series[6].date).toBe("2026-10-12");
  });

  it("sin filas devuelve todo en 0", () => {
    const series = fillDailySeries([], periods);
    expect(series.every((p) => p.revenueCents === 0 && p.tickets === 0)).toBe(true);
  });
});

describe("buildZoneSlices", () => {
  it("agrupa el resto en Otras (top 4 + Otras)", () => {
    const slices = buildZoneSlices([
      { name: "A", tickets: 10 },
      { name: "B", tickets: 50 },
      { name: "C", tickets: 30 },
      { name: "D", tickets: 20 },
      { name: "E", tickets: 5 },
      { name: "F", tickets: 3 },
    ]);
    expect(slices).toEqual([
      { name: "B", tickets: 50 },
      { name: "C", tickets: 30 },
      { name: "D", tickets: 20 },
      { name: "A", tickets: 10 },
      { name: "Otras", tickets: 8 },
    ]);
  });

  it("no agrega Otras si caben todas", () => {
    const slices = buildZoneSlices([
      { name: "A", tickets: 1 },
      { name: "B", tickets: 2 },
    ]);
    expect(slices.map((s) => s.name)).toEqual(["B", "A"]);
  });
});

describe("computeOccupancy", () => {
  it("pondera por capacidad", () => {
    expect(
      computeOccupancy([
        { sold: 50, capacity: 100 },
        { sold: 100, capacity: 100 },
      ]),
    ).toBe(0.75);
  });

  it("ignora capacidad 0 y devuelve null si no queda ninguna", () => {
    expect(computeOccupancy([{ sold: 5, capacity: 0 }])).toBeNull();
    expect(computeOccupancy([])).toBeNull();
    expect(
      computeOccupancy([
        { sold: 5, capacity: 0 },
        { sold: 10, capacity: 20 },
      ]),
    ).toBe(0.5);
  });
});

describe("averageTicketCents", () => {
  it("redondea a céntimos enteros", () => {
    expect(averageTicketCents(1000, 3)).toBe(333);
  });

  it("devuelve null con 0 entradas", () => {
    expect(averageTicketCents(0, 0)).toBeNull();
  });
});

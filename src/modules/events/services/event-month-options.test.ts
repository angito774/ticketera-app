import { describe, expect, it } from "vitest";

import {
  buildMonthOptions,
  MONTH_OPTIONS_LIMIT,
} from "@/modules/events/services/event-month-options";

const NOW = new Date("2026-10-07T15:00:00Z");

const month = (value: string) => ({ value, label: `L-${value}` });

describe("buildMonthOptions", () => {
  it("descarta meses pasados y conserva el mes actual", () => {
    const result = buildMonthOptions(
      [month("2026-08"), month("2026-09"), month("2026-10"), month("2026-11")],
      NOW
    );
    expect(result.map((m) => m.value)).toEqual(["2026-10", "2026-11"]);
  });

  it("ordena ascendentemente y conserva la etiqueta original", () => {
    const result = buildMonthOptions([month("2026-12"), month("2026-10")], NOW);
    expect(result).toEqual([
      { value: "2026-10", label: "L-2026-10" },
      { value: "2026-12", label: "L-2026-12" },
    ]);
  });

  it("limita a 6 meses", () => {
    const months = ["2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03", "2027-04", "2027-05"].map(month);
    const result = buildMonthOptions(months, NOW);
    expect(MONTH_OPTIONS_LIMIT).toBe(6);
    expect(result.map((m) => m.value)).toEqual([
      "2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03",
    ]);
  });

  it("no incluye campos extra como count", () => {
    const result = buildMonthOptions([{ ...month("2026-11"), count: 3 } as ReturnType<typeof month>], NOW);
    expect(result[0]).toEqual({ value: "2026-11", label: "L-2026-11" });
  });

  it("genera los próximos 6 meses cuando months es undefined", () => {
    const result = buildMonthOptions(undefined, NOW);
    expect(result).toEqual([
      { value: "2026-10", label: "Octubre 2026" },
      { value: "2026-11", label: "Noviembre 2026" },
      { value: "2026-12", label: "Diciembre 2026" },
      { value: "2027-01", label: "Enero 2027" },
      { value: "2027-02", label: "Febrero 2027" },
      { value: "2027-03", label: "Marzo 2027" },
    ]);
  });

  it("genera el fallback cuando todos los meses son pasados o la lista está vacía", () => {
    expect(buildMonthOptions([], NOW)).toHaveLength(6);
    const past = buildMonthOptions([month("2026-01")], NOW);
    expect(past[0]).toEqual({ value: "2026-10", label: "Octubre 2026" });
  });

  it("cruza el cambio de año en el fallback", () => {
    const result = buildMonthOptions([], new Date("2026-12-10T12:00:00Z"));
    expect(result.map((m) => m.value)).toEqual([
      "2026-12", "2027-01", "2027-02", "2027-03", "2027-04", "2027-05",
    ]);
  });

  it("usa el mes de Lima cerca de medianoche UTC (01-nov UTC sigue siendo octubre en Lima)", () => {
    const now = new Date("2026-11-01T02:00:00Z");
    const result = buildMonthOptions([month("2026-10"), month("2026-11")], now);
    expect(result.map((m) => m.value)).toEqual(["2026-10", "2026-11"]);
    expect(buildMonthOptions([], now)[0].value).toBe("2026-10");
  });

  it("pasa a noviembre en Lima cuando son las 05:00 UTC del día 1", () => {
    const now = new Date("2026-11-01T05:00:00Z");
    const result = buildMonthOptions([month("2026-10"), month("2026-11")], now);
    expect(result.map((m) => m.value)).toEqual(["2026-11"]);
  });
});

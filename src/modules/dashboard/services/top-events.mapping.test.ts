import { describe, expect, it } from "vitest";
import type { TopEventRow } from "../types/dashboard.types";
import { sortTopEvents, type TopEventSortKey } from "./top-events.mapping";

function row(title: string, overrides: Partial<TopEventRow> = {}): TopEventRow {
  return {
    eventId: title,
    title,
    categoryLabel: "Música",
    city: "Lima",
    tickets: 10,
    revenueCents: 1000,
    occupancy: 0.5,
    ...overrides,
  };
}

const titles = (rows: TopEventRow[]) => rows.map((r) => r.title);

describe("sortTopEvents", () => {
  const rows = [
    row("B", { tickets: 20, revenueCents: 500, occupancy: 0.9 }),
    row("A", { tickets: 5, revenueCents: 900, occupancy: 0.1 }),
    row("C", { tickets: 12, revenueCents: 100, occupancy: 0.5 }),
  ];

  it.each<[TopEventSortKey, string[], string[]]>([
    ["tickets", ["A", "C", "B"], ["B", "C", "A"]],
    ["revenueCents", ["C", "B", "A"], ["A", "B", "C"]],
    ["occupancy", ["A", "C", "B"], ["B", "C", "A"]],
  ])("ordena por %s asc y desc", (key, asc, desc) => {
    expect(titles(sortTopEvents(rows, key, "asc"))).toEqual(asc);
    expect(titles(sortTopEvents(rows, key, "desc"))).toEqual(desc);
  });

  it("deja la ocupación null al final en ambas direcciones", () => {
    const withNull = [row("N", { occupancy: null }), ...rows];
    expect(titles(sortTopEvents(withNull, "occupancy", "asc")).at(-1)).toBe("N");
    expect(titles(sortTopEvents(withNull, "occupancy", "desc")).at(-1)).toBe("N");
  });

  it("desempata por título en ambas direcciones", () => {
    const tied = [row("Z"), row("M"), row("A", { occupancy: null }), row("B", { occupancy: null })];
    expect(titles(sortTopEvents(tied, "tickets", "asc"))).toEqual(["A", "B", "M", "Z"]);
    expect(titles(sortTopEvents(tied, "tickets", "desc"))).toEqual(["A", "B", "M", "Z"]);
    expect(titles(sortTopEvents(tied, "occupancy", "desc"))).toEqual(["M", "Z", "A", "B"]);
  });

  it("no muta el arreglo original", () => {
    const copy = [...rows];
    sortTopEvents(rows, "tickets", "asc");
    expect(rows).toEqual(copy);
  });
});

import type { TopEventRow } from "../types/dashboard.types";

export type TopEventSortKey = "tickets" | "occupancy" | "revenueCents";
export type SortDirection = "asc" | "desc";

export function sortTopEvents(
  rows: TopEventRow[],
  key: TopEventSortKey,
  dir: SortDirection
): TopEventRow[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = a[key];
    const right = b[key];
    if (left === null && right !== null) return 1;
    if (left !== null && right === null) return -1;
    if (left !== null && right !== null && left !== right) return (left - right) * sign;
    return a.title.localeCompare(b.title, "es");
  });
}

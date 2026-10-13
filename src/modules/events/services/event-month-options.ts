import { monthLabel, toLimaIso } from "@/modules/events/services/event-list.mapping";
import type { FacetOption } from "@/modules/events/services/events.service";

export const MONTH_OPTIONS_LIMIT = 6;

function limaMonthKey(date: Date): string {
  return toLimaIso(date).slice(0, 7);
}

function nextMonthKeys(now: Date, count: number): string[] {
  const [year, month] = limaMonthKey(now).split("-").map(Number);
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(Date.UTC(year, month - 1 + offset, 1));
    return date.toISOString().slice(0, 7);
  });
}

/** Próximos meses a ofrecer en el selector de Fecha. */
export function buildMonthOptions(
  months: Pick<FacetOption, "value" | "label">[] | undefined,
  now: Date
): { value: string; label: string }[] {
  const currentMonth = limaMonthKey(now);
  const upcoming = (months ?? [])
    .filter((month) => month.value >= currentMonth)
    .sort((a, b) => a.value.localeCompare(b.value))
    .slice(0, MONTH_OPTIONS_LIMIT)
    .map(({ value, label }) => ({ value, label }));

  if (upcoming.length > 0) return upcoming;

  return nextMonthKeys(now, MONTH_OPTIONS_LIMIT).map((value) => ({
    value,
    label: monthLabel(value),
  }));
}

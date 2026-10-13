import { toLimaDate } from "@/lib/business-days";
import type {
  DailyPoint,
  DashboardPeriod,
  DashboardPeriods,
  ZoneSlice,
} from "@/modules/dashboard/types/dashboard.types";

const OTHER_ZONES_LABEL = "Otras";
const DEFAULT_MAX_SLICES = 5;

/** Suma días a una fecha "YYYY-MM-DD" operando en UTC puro (no depende de la zona del proceso). */
export function addDaysIso(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

/** Instante de la medianoche Lima (UTC−5, sin horario de verano) de una fecha de calendario. */
export function limaDayStart(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00-05:00`);
}

/** Últimos N días Lima incluyendo hoy, y los N días inmediatamente previos (sin solapamiento ni huecos). */
export function resolvePeriods(period: DashboardPeriod, now: Date): DashboardPeriods {
  const today = toLimaDate(now);
  const currentFrom = addDaysIso(today, -(period - 1));
  const previousTo = addDaysIso(currentFrom, -1);
  return {
    days: period,
    current: { from: currentFrom, to: today },
    previous: { from: addDaysIso(previousTo, -(period - 1)), to: previousTo },
  };
}

/** Variación porcentual; `null` si no hay base de comparación (previo 0 o nulo). */
export function computeDelta(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function fillDailySeries(
  rows: { date: string; revenueCents: number; tickets: number }[],
  periods: DashboardPeriods,
): DailyPoint[] {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  return Array.from({ length: periods.days }, (_, index) => {
    const date = addDaysIso(periods.current.from, index);
    const current = byDate.get(date);
    const previous = byDate.get(addDaysIso(periods.previous.from, index));
    return {
      date,
      revenueCents: current?.revenueCents ?? 0,
      tickets: current?.tickets ?? 0,
      prevRevenueCents: previous?.revenueCents ?? 0,
      prevTickets: previous?.tickets ?? 0,
    };
  });
}

/** Top (max - 1) zonas por entradas + "Otras" con el resto; sin "Otras" si todo cabe. */
export function buildZoneSlices(rows: ZoneSlice[], maxSlices = DEFAULT_MAX_SLICES): ZoneSlice[] {
  const sorted = [...rows].sort((a, b) => b.tickets - a.tickets);
  if (sorted.length <= maxSlices) return sorted;
  const top = sorted.slice(0, maxSlices - 1);
  const others = sorted.slice(maxSlices - 1).reduce((sum, row) => sum + row.tickets, 0);
  return [...top, { name: OTHER_ZONES_LABEL, tickets: others }];
}

/** Ocupación ponderada (vendidas / capacidad) ignorando eventos sin capacidad válida. */
export function computeOccupancy(rows: { sold: number; capacity: number }[]): number | null {
  const valid = rows.filter((row) => row.capacity > 0);
  if (valid.length === 0) return null;
  const sold = valid.reduce((sum, row) => sum + row.sold, 0);
  const capacity = valid.reduce((sum, row) => sum + row.capacity, 0);
  return Math.min(sold / capacity, 1);
}

export function averageTicketCents(revenueCents: number, tickets: number): number | null {
  if (tickets <= 0) return null;
  return Math.round(revenueCents / tickets);
}

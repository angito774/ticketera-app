export const DASHBOARD_PERIODS = [7, 30, 90] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export interface DashboardFilters {
  period: DashboardPeriod;
  category?: string;
  city?: string;
}

/** Fechas de calendario Lima "YYYY-MM-DD", extremos inclusivos. */
export interface PeriodRange {
  from: string;
  to: string;
}

export interface DashboardPeriods {
  days: DashboardPeriod;
  current: PeriodRange;
  previous: PeriodRange;
}

export interface MetricWithDelta {
  /** Céntimos (ingresos, ticket promedio) o cantidad (entradas); null = sin dato. */
  value: number | null;
  previous: number | null;
  /** null si previous es 0/null (sin base de comparación). */
  deltaPct: number | null;
}

export interface DailyPoint {
  date: string;
  revenueCents: number;
  tickets: number;
  prevRevenueCents: number;
  prevTickets: number;
}

export interface ZoneSlice {
  name: string;
  tickets: number;
}

export interface CategoryRevenue {
  slug: string;
  label: string;
  revenueCents: number;
}

export interface TopEventRow {
  eventId: string;
  title: string;
  categoryLabel: string;
  city: string;
  tickets: number;
  revenueCents: number;
  /** 0..1; vendidas totales / capacidad. */
  occupancy: number | null;
}

export interface DashboardOverview {
  periods: DashboardPeriods;
  isEmpty: boolean;
  kpis: {
    revenue: MetricWithDelta;
    tickets: MetricWithDelta;
    averageTicket: MetricWithDelta;
    /** 0..1, sin delta. */
    occupancy: number | null;
  };
  daily: DailyPoint[];
  zones: ZoneSlice[];
  categories: CategoryRevenue[];
  topEvents: TopEventRow[];
  cityOptions: string[];
  selectedCategoryLabel: string | null;
}

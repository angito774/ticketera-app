import { z } from "zod";
import {
  DASHBOARD_PERIODS,
  type DashboardFilters,
  type DashboardPeriod,
} from "../types/dashboard.types";

export const DEFAULT_PERIOD: DashboardPeriod = 30;

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// preprocess hace que la clave sea opcional en la entrada (searchParams sin el parámetro).
const period = z.preprocess((v) => v, z.unknown()).transform((value): DashboardPeriod => {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return DEFAULT_PERIOD;
  const n = Number(value);
  return DASHBOARD_PERIODS.find((p) => p === n) ?? DEFAULT_PERIOD;
});

const category = z.preprocess((v) => v, z.unknown()).transform((value): string | undefined => {
  if (typeof value !== "string" || value.length > 60) return undefined;
  return SLUG_PATTERN.test(value) ? value : undefined;
});

const city = z.preprocess((v) => v, z.unknown()).transform((value): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= 80 ? trimmed : undefined;
});

// Un parámetro repetido llega como array y cae al valor por defecto.
export const dashboardFiltersSchema: z.ZodType<DashboardFilters> = z.object({
  period,
  category,
  city,
});

export function toDashboardSearchParams(filters: DashboardFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.period !== DEFAULT_PERIOD) params.set("period", String(filters.period));
  if (filters.category) params.set("category", filters.category);
  if (filters.city) params.set("city", filters.city);
  return params;
}

export function toggleCategory(filters: DashboardFilters, slug: string): DashboardFilters {
  if (filters.category === slug) {
    const { category: _removed, ...rest } = filters;
    void _removed;
    return rest;
  }
  return { ...filters, category: slug };
}

import { z } from "zod";

import type { EventCategory } from "@/modules/events/types/event.types";

export const PRICE_RANGES = {
  "0-100": { label: "Hasta S/ 100", min: 0, max: 100 },
  "100-200": { label: "S/ 100 – 200", min: 100, max: 200 },
  "200-300": { label: "S/ 200 – 300", min: 200, max: 300 },
  "300+": { label: "Más de S/ 300", min: 300, max: Infinity },
} as const;

export type PriceRangeKey = keyof typeof PRICE_RANGES;

export const EVENT_SORTS = ["date", "price"] as const;
export type EventSort = (typeof EVENT_SORTS)[number];

export const EVENT_SORT_LABELS: Record<EventSort, string> = {
  date: "Fecha",
  price: "Precio más bajo",
};

const CATEGORIES = ["concert", "theater"] as const satisfies readonly EventCategory[];

export interface EventFilters {
  q: string;
  categories: EventCategory[];
  cities: string[];
  /** "2026-11" */
  month: string | null;
  price: PriceRangeKey | null;
  sort: EventSort;
}

export type FilterGroup = "categories" | "cities" | "month" | "price";

export const DEFAULT_EVENT_FILTERS: EventFilters = {
  q: "",
  categories: [],
  cities: [],
  month: null,
  price: null,
  sort: "date",
};

type SearchParamsRecord = Record<string, string | string[] | undefined>;

const toList = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const first = (value: string | string[] | undefined): string | undefined => toList(value)[0];

const categorySchema = z.enum(CATEGORIES);
const priceSchema = z.enum(Object.keys(PRICE_RANGES) as [PriceRangeKey, ...PriceRangeKey[]]);
const sortSchema = z.enum(EVENT_SORTS);
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const citySchema = z.string().trim().min(1).max(60);

/** Convierte los `searchParams` de la URL en filtros válidos, descartando lo inválido. */
export function parseEventFilters(params: SearchParamsRecord): EventFilters {
  const valid = <T>(schema: z.ZodType<T>, value: unknown): T | undefined => {
    const result = schema.safeParse(value);
    return result.success ? result.data : undefined;
  };
  const unique = <T>(values: (T | undefined)[]): T[] =>
    [...new Set(values.filter((value): value is T => value !== undefined))];

  return {
    q: (first(params.q) ?? "").trim().slice(0, 100),
    categories: unique(toList(params.category).map((value) => valid(categorySchema, value))),
    cities: unique(toList(params.city).map((value) => valid(citySchema, value))),
    month: valid(monthSchema, first(params.month)) ?? null,
    price: valid(priceSchema, first(params.price)) ?? null,
    sort: valid(sortSchema, first(params.sort)) ?? DEFAULT_EVENT_FILTERS.sort,
  };
}

/** Inversa de `parseEventFilters`; omite los valores por defecto para URLs limpias. */
export function toSearchParams(filters: EventFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  filters.categories.forEach((category) => params.append("category", category));
  filters.cities.forEach((city) => params.append("city", city));
  if (filters.month) params.set("month", filters.month);
  if (filters.price) params.set("price", filters.price);
  if (filters.sort !== DEFAULT_EVENT_FILTERS.sort) params.set("sort", filters.sort);
  return params;
}

/** Cantidad de valores activos en los grupos indicados (todos por defecto). */
export function countActiveFilters(
  filters: EventFilters,
  groups: FilterGroup[] = ["categories", "cities", "month", "price"]
): number {
  return groups.reduce((total, group) => {
    const value = filters[group];
    return total + (Array.isArray(value) ? value.length : value ? 1 : 0);
  }, 0);
}

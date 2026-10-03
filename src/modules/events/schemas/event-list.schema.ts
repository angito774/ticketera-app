import {
  parseEventFilters,
  type EventFilters,
} from "@/modules/events/schemas/event-filters.schema";

export type EventListScope = "public" | "organizer";
export type EventListStatus = "all" | "published" | "draft";

export const MAX_PAGE_SIZE = 50;

export interface EventListParams extends EventFilters {
  scope: EventListScope;
  featured?: boolean;
  /** Solo aplica con scope "organizer". */
  status: EventListStatus;
  /** Solo aplica con scope "organizer". */
  organizationId?: string;
  page: number;
  pageSize: number;
}

type RawParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const positiveInt = (value: string | undefined): number | undefined => {
  if (value === undefined || !/^\d+$/.test(value.trim())) return undefined;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 1 ? n : undefined;
};

export function parseEventListParams(raw: RawParams): EventListParams {
  const filters = parseEventFilters(raw);
  const scope: EventListScope = first(raw.scope) === "organizer" ? "organizer" : "public";
  const statusRaw = first(raw.status);
  const status: EventListStatus =
    scope === "organizer" && (statusRaw === "published" || statusRaw === "draft")
      ? statusRaw
      : "all";
  const organizationId =
    scope === "organizer" ? first(raw.organizationId)?.trim().slice(0, 100) || undefined : undefined;

  return {
    ...filters,
    scope,
    ...(first(raw.featured) === "true" ? { featured: true } : {}),
    status,
    ...(organizationId ? { organizationId } : {}),
    page: positiveInt(first(raw.page)) ?? 1,
    pageSize: Math.min(positiveInt(first(raw.pageSize)) ?? MAX_PAGE_SIZE, MAX_PAGE_SIZE),
  };
}

/** Inversa de `parseEventListParams`; omite los valores por defecto. */
export function eventListToSearchParams(p: EventListParams): URLSearchParams {
  const params = new URLSearchParams();
  params.set("scope", p.scope);
  if (p.q.trim()) params.set("q", p.q.trim());
  p.categories.forEach((category) => params.append("category", category));
  p.cities.forEach((city) => params.append("city", city));
  if (p.month) params.set("month", p.month);
  if (p.price) params.set("price", p.price);
  if (p.sort !== "date") params.set("sort", p.sort);
  if (p.featured === true) params.set("featured", "true");
  if (p.scope === "organizer") {
    if (p.status !== "all") params.set("status", p.status);
    if (p.organizationId?.trim()) params.set("organizationId", p.organizationId.trim());
  }
  if (p.page !== 1) params.set("page", String(p.page));
  if (p.pageSize !== MAX_PAGE_SIZE) params.set("pageSize", String(p.pageSize));
  return params;
}

const sortedUnique = (values: string[]): string[] => [...new Set(values)].sort();

/** Clave de caché estable: orden fijo y listas ordenadas/únicas; los parámetros equivalentes dan la misma clave. */
export function eventListKey(p: EventListParams): readonly unknown[] {
  const organizer = p.scope === "organizer";
  return [
    "events",
    p.scope,
    {
      q: p.q.trim(),
      categories: sortedUnique(p.categories),
      cities: sortedUnique(p.cities),
      month: p.month,
      price: p.price,
      sort: p.sort,
      featured: p.featured === true,
      status: organizer ? p.status : "all",
      organizationId: organizer ? p.organizationId?.trim() || null : null,
      page: p.page,
      pageSize: p.pageSize,
    },
  ] as const;
}

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lt,
  type SQL,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import {
  categories,
  eventSeats,
  events,
  ticketTypes,
  venues,
  venueZones,
} from "@/db/schema";
import { escapeLike } from "@/lib/escape-like";
import { pageCount } from "@/modules/admin/schemas/member-list.schema";
import type { CurrentUser } from "@/modules/auth/services/current-user.service";
import { can } from "@/modules/auth/services/permissions";
import { PRICE_RANGES } from "@/modules/events/schemas/event-filters.schema";
import type { EventListParams } from "@/modules/events/schemas/event-list.schema";
import {
  centavosToSoles,
  computeEventTotals,
  mapTierCapacity,
} from "@/modules/events/services/event-list.calc";
import {
  limaMonthRange,
  mapPublicEvent,
  monthLabel,
  toLimaIso,
} from "@/modules/events/services/event-list.mapping";
import type {
  EventFacets,
} from "@/modules/events/services/events.service";
import type {
  OrganizerEventList,
  OrganizerEventRow,
  OrganizerEventTier,
  OrganizerSummary,
  PublicEventList,
} from "@/modules/events/types/event-list.types";
import {
  EVENT_CATEGORY_LABELS,
  type Event,
  type EventCategory,
} from "@/modules/events/types/event.types";

export class EventsAccessError extends Error {
  constructor(public readonly status: 401 | 403) {
    super(status === 401 ? "No autenticado" : "Sin permiso");
    this.name = "EventsAccessError";
  }
}

/**
 * Menor precio (centavos) de los tipos de entrada del evento. Las columnas van calificadas a mano:
 * Drizzle renderiza las columnas sin tabla dentro de subconsultas y "id" se resolvería a la tabla interna.
 */
const MIN_PRICE_CENTS = sql<number | null>`(select min("ticket_types"."price") from "ticket_types" where "ticket_types"."event_id" = "events"."id")`;

const LIMA_MONTH = sql<string>`to_char("events"."starts_at" at time zone 'America/Lima', 'YYYY-MM')`;

function priceCondition(key: NonNullable<EventListParams["price"]>): SQL {
  const { min, max } = PRICE_RANGES[key];
  return and(
    min === 0 ? undefined : sql`${MIN_PRICE_CENTS} > ${min * 100}`,
    Number.isFinite(max) ? sql`${MIN_PRICE_CENTS} <= ${max * 100}` : undefined,
    sql`${MIN_PRICE_CENTS} is not null`,
  ) as SQL;
}

function emptyPage<T>(extra: T) {
  return { events: [], total: 0, page: 1, pageCount: 1, ...extra };
}

function clampPage(total: number, params: EventListParams) {
  const pages = pageCount(total, params.pageSize);
  return { pages, page: Math.min(Math.max(params.page, 1), pages) };
}

function filterConditions(params: EventListParams): (SQL | undefined)[] {
  const search = params.q ? `%${escapeLike(params.q)}%` : null;
  const month = params.month ? limaMonthRange(params.month) : null;
  return [
    search ? ilike(events.title, search) : undefined,
    params.categories.length ? inArray(categories.slug, params.categories) : undefined,
    params.cities.length ? inArray(venues.city, params.cities) : undefined,
    month ? gte(events.startsAt, month.start) : undefined,
    month ? lt(events.startsAt, month.end) : undefined,
    params.price ? priceCondition(params.price) : undefined,
    params.featured ? eq(events.featured, true) : undefined,
  ];
}

export async function listPublicEvents(params: EventListParams): Promise<PublicEventList> {
  const where = and(eq(events.status, "published"), ...filterConditions(params));

  const [{ total }] = await db
    .select({ total: count() })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .innerJoin(categories, eq(events.categoryId, categories.id))
    .where(where);

  const { pages, page } = clampPage(total, params);

  const rows = await db
    .select({
      slug: events.slug,
      title: events.title,
      categorySlug: categories.slug,
      startsAt: events.startsAt,
      venueName: venues.name,
      city: venues.city,
      minPriceCents: MIN_PRICE_CENTS,
      coverImageUrl: events.coverImageUrl,
      featured: events.featured,
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .innerJoin(categories, eq(events.categoryId, categories.id))
    .where(where)
    .orderBy(
      ...(params.sort === "price"
        ? [asc(sql`coalesce(${MIN_PRICE_CENTS}, 0)`), asc(events.startsAt)]
        : [asc(events.startsAt)]),
      asc(events.id),
    )
    .limit(params.pageSize)
    .offset((page - 1) * params.pageSize);

  return { events: rows.map(mapPublicEvent), total, page, pageCount: pages };
}

export const HERO_MAX_EVENTS = 5;

export async function listHeroEvents(): Promise<Event[]> {
  const rows = await db
    .select({
      slug: events.slug,
      title: events.title,
      categorySlug: categories.slug,
      startsAt: events.startsAt,
      venueName: venues.name,
      city: venues.city,
      minPriceCents: MIN_PRICE_CENTS,
      coverImageUrl: events.coverImageUrl,
      featured: events.featured,
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .innerJoin(categories, eq(events.categoryId, categories.id))
    .where(
      and(
        eq(events.status, "published"),
        eq(events.featured, true),
        gte(events.startsAt, sql`now()`),
      ),
    )
    .orderBy(asc(events.startsAt), asc(events.id))
    .limit(HERO_MAX_EVENTS);

  return rows.map(mapPublicEvent);
}

const EMPTY_SUMMARY:OrganizerSummary = { sold: 0, revenue: 0, published: 0, total: 0 };

export async function listOrganizerEvents(
  actor: CurrentUser | null,
  params: EventListParams,
): Promise<OrganizerEventList> {
  if (!actor) throw new EventsAccessError(401);
  if (!can(actor, "events:manage")) throw new EventsAccessError(403);

  const scope = actor.isSuperAdmin
    ? null
    : actor.memberships
        .filter((m) => can(actor, "events:manage", m.organizationId))
        .map((m) => m.organizationId);
  if (scope && (scope.length === 0 || (params.organizationId && !scope.includes(params.organizationId)))) {
    return emptyPage({ summary: EMPTY_SUMMARY });
  }

  const scopeWhere = and(
    scope ? inArray(events.organizationId, scope) : undefined,
    params.organizationId ? eq(events.organizationId, params.organizationId) : undefined,
  );
  const where = and(
    scopeWhere,
    params.status === "all" ? undefined : eq(events.status, params.status),
    ...filterConditions(params),
  );

  const [{ total }] = await db
    .select({ total: count() })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .innerJoin(categories, eq(events.categoryId, categories.id))
    .where(where);

  const summary = await getSummary(scopeWhere);
  const { pages, page } = clampPage(total, params);

  const rows = await db
    .select({
      id: events.id,
      slug: events.slug,
      status: events.status,
      title: events.title,
      categorySlug: categories.slug,
      description: events.description,
      startsAt: events.startsAt,
      venueName: venues.name,
      city: venues.city,
      imageUrl: events.coverImageUrl,
      featured: events.featured,
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .innerJoin(categories, eq(events.categoryId, categories.id))
    .where(where)
    .orderBy(desc(events.startsAt), asc(events.id))
    .limit(params.pageSize)
    .offset((page - 1) * params.pageSize);

  const tiersByEvent = await loadTiers(rows.map((row) => row.id));

  const result: OrganizerEventRow[] = rows.map((row) => {
    const tiers = tiersByEvent.get(row.id) ?? [];
    const totals = computeEventTotals(
      tiers.map((tier) => ({
        priceCents: Math.round(tier.price * 100),
        quantity: tier.quantity,
        sold: tier.sold,
      })),
    );
    return {
      id: row.id,
      slug: row.slug,
      status: row.status,
      title: row.title,
      category: row.categorySlug in EVENT_CATEGORY_LABELS ? (row.categorySlug as EventCategory) : null,
      description: row.description,
      startsAt: toLimaIso(row.startsAt),
      venue: row.venueName,
      city: row.city,
      imageUrl: row.imageUrl,
      featured: row.featured,
      tiers,
      ...totals,
    };
  });

  return { events: result, total, page, pageCount: pages, summary };
}

/** Todos los eventos del alcance (sin filtro de estado ni paginación), en una sola consulta agregada. */
async function getSummary(scopeWhere: SQL | undefined): Promise<OrganizerSummary> {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      published: sql<number>`(count(*) filter (where "events"."status" = 'published'))::int`,
      sold: sql<number>`coalesce(sum(${SOLD_BY_EVENT}), 0)::float8`,
      revenueCents: sql<number>`coalesce(sum(${REVENUE_BY_EVENT}), 0)::float8`,
    })
    .from(events)
    .where(scopeWhere);

  return {
    total: row.total,
    published: row.published,
    sold: Number(row.sold),
    revenue: centavosToSoles(Number(row.revenueCents)),
  };
}

const SOLD_BY_EVENT = sql`(select coalesce(sum("ticket_types"."quantity_sold"), 0) from "ticket_types" where "ticket_types"."event_id" = "events"."id")`;
const REVENUE_BY_EVENT = sql`(select coalesce(sum("ticket_types"."quantity_sold"::bigint * "ticket_types"."price"), 0) from "ticket_types" where "ticket_types"."event_id" = "events"."id")`;

/** Una consulta para los tipos de la página y otra agrupada para los asientos de zonas numeradas. */
async function loadTiers(eventIds: string[]): Promise<Map<string, OrganizerEventTier[]>> {
  const byEvent = new Map<string, OrganizerEventTier[]>();
  if (eventIds.length === 0) return byEvent;

  const types = await db
    .select({
      id: ticketTypes.id,
      eventId: ticketTypes.eventId,
      name: venueZones.name,
      priceCents: ticketTypes.price,
      quantityTotal: ticketTypes.quantityTotal,
      sold: ticketTypes.quantitySold,
    })
    .from(ticketTypes)
    .innerJoin(venueZones, eq(ticketTypes.venueZoneId, venueZones.id))
    .where(inArray(ticketTypes.eventId, eventIds))
    .orderBy(asc(ticketTypes.price), asc(venueZones.name), asc(ticketTypes.id));

  const numberedIds = types.filter((t) => t.quantityTotal === null).map((t) => t.id);
  const seatCounts = new Map<string, number>();
  if (numberedIds.length > 0) {
    const seats = await db
      .select({ ticketTypeId: eventSeats.ticketTypeId, seats: count() })
      .from(eventSeats)
      .where(inArray(eventSeats.ticketTypeId, numberedIds))
      .groupBy(eventSeats.ticketTypeId);
    seats.forEach((s) => seatCounts.set(s.ticketTypeId, s.seats));
  }

  for (const type of types) {
    const tiers = byEvent.get(type.eventId) ?? [];
    tiers.push({
      id: type.id,
      name: type.name,
      price: centavosToSoles(type.priceCents),
      quantity: mapTierCapacity(type.quantityTotal, seatCounts.get(type.id) ?? 0),
      sold: type.sold,
    });
    byEvent.set(type.eventId, tiers);
  }
  return byEvent;
}

/** Facetas del buscador sobre eventos publicados: categorías, ciudades y meses (hora de Lima). */
export async function getPublicEventFacets(): Promise<EventFacets> {
  const published = eq(events.status, "published");

  const [categoryRows, cityRows, monthRows] = await Promise.all([
    db
      .select({ slug: categories.slug, n: count() })
      .from(events)
      .innerJoin(categories, eq(events.categoryId, categories.id))
      .where(published)
      .groupBy(categories.slug),
    db
      .select({ city: venues.city, n: count() })
      .from(events)
      .innerJoin(venues, eq(events.venueId, venues.id))
      .where(published)
      .groupBy(venues.city),
    db
      .select({ month: LIMA_MONTH, n: count() })
      .from(events)
      .where(published)
      .groupBy(LIMA_MONTH),
  ]);

  const categoryCounts = new Map(categoryRows.map((r) => [r.slug, r.n]));

  return {
    categories: (Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[]).map((category) => ({
      value: category,
      label: EVENT_CATEGORY_LABELS[category].plural,
      count: categoryCounts.get(category) ?? 0,
    })),
    cities: cityRows
      .sort((a, b) => a.city.localeCompare(b.city, "es"))
      .map((r) => ({ value: r.city, label: r.city, count: r.n })),
    months: monthRows
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((r) => ({ value: r.month, label: monthLabel(r.month), count: r.n })),
  };
}

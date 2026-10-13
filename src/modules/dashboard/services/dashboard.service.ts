import { and, desc, eq, gte, inArray, lt, ne, type SQL, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  categories,
  events,
  orderItems,
  orders,
  ticketTypes,
  venues,
  venueZones,
} from "@/db/schema";
import type { CurrentUser } from "@/modules/auth/services/current-user.service";
import { can } from "@/modules/auth/services/permissions";
import {
  addDaysIso,
  averageTicketCents,
  buildZoneSlices,
  computeDelta,
  computeOccupancy,
  fillDailySeries,
  limaDayStart,
  resolvePeriods,
} from "@/modules/dashboard/services/dashboard.mapping";
import type {
  CategoryRevenue,
  DashboardFilters,
  DashboardOverview,
  DashboardPeriods,
  MetricWithDelta,
  PeriodRange,
  TopEventRow,
} from "@/modules/dashboard/types/dashboard.types";

const TOP_EVENTS_LIMIT = 10;

const LIMA_DAY = sql<string>`to_char((${orders.createdAt} at time zone 'America/Lima')::date, 'YYYY-MM-DD')`;
const TICKETS_BY_ORDER = sql<number>`(select coalesce(sum("order_items"."quantity"), 0) from "order_items" where "order_items"."order_id" = "orders"."id")::int`;
const SOLD_BY_EVENT = sql<number>`(select coalesce(sum("ticket_types"."quantity_sold"), 0) from "ticket_types" where "ticket_types"."event_id" = "events"."id")::int`;
const CAPACITY_BY_EVENT = sql<number>`(select coalesce(sum(case when "venue_zones"."seating" = 'general' then coalesce("ticket_types"."quantity_total", 0) else (select count(*) from "event_seats" where "event_seats"."ticket_type_id" = "ticket_types"."id") end), 0) from "ticket_types" inner join "venue_zones" on "venue_zones"."id" = "ticket_types"."venue_zone_id" where "ticket_types"."event_id" = "events"."id")::int`;

/** Rango de instantes [inicio, fin) cubriendo días de calendario Lima completos. */
function instantRange(from: string, to: string): SQL[] {
  return [
    gte(orders.createdAt, limaDayStart(from)),
    lt(orders.createdAt, limaDayStart(addDaysIso(to, 1))),
  ];
}

/** Organizaciones visibles: `null` = todas (super admin); lista vacía = ninguna. */
function scopeOrganizations(actor: CurrentUser): string[] | null {
  if (actor.isSuperAdmin) return null;
  return actor.memberships
    .filter((m) => can(actor, "members:manage", m.organizationId))
    .map((m) => m.organizationId);
}

/** Órdenes pagadas de eventos no cancelados, dentro del alcance y el rango dados. */
function salesConditions(scope: string[] | null, range: PeriodRange, categorySlug?: string): SQL[] {
  return [
    eq(orders.status, "paid"),
    ne(events.status, "cancelled"),
    ...instantRange(range.from, range.to),
    ...(scope ? [inArray(events.organizationId, scope)] : []),
    ...(categorySlug ? [eq(categories.slug, categorySlug)] : []),
  ];
}

function emptyOverview(periods: DashboardPeriods): DashboardOverview {
  const zero: MetricWithDelta = { value: 0, previous: 0, deltaPct: null };
  return {
    periods,
    isEmpty: true,
    kpis: {
      revenue: zero,
      tickets: zero,
      averageTicket: { value: null, previous: null, deltaPct: null },
      occupancy: null,
    },
    daily: fillDailySeries([], periods),
    zones: [],
    categories: [],
    topEvents: [],
    cityOptions: [],
    selectedCategoryLabel: null,
  };
}

function withDelta(value: number | null, previous: number | null): MetricWithDelta {
  return { value, previous, deltaPct: computeDelta(value, previous) };
}

export async function getDashboardOverview(
  actor: CurrentUser,
  filters: DashboardFilters,
  now: Date = new Date(),
): Promise<DashboardOverview> {
  const periods = resolvePeriods(filters.period, now);
  const scope = scopeOrganizations(actor);
  if (scope && scope.length === 0) return emptyOverview(periods);

  const { current, previous } = periods;
  const full: PeriodRange = { from: previous.from, to: current.to };
  const withCategory = salesConditions(scope, current, filters.category);

  const [dailyRows, zoneRows, categoryRows, topRows, occupancyRows, cityRows, selectedRows] =
    await Promise.all([
      db
        .select({
          date: LIMA_DAY,
          revenueCents: sql<number>`coalesce(sum(${orders.totalAmount}), 0)::bigint`,
          tickets: sql<number>`coalesce(sum(${TICKETS_BY_ORDER}), 0)::int`,
        })
        .from(orders)
        .innerJoin(events, eq(orders.eventId, events.id))
        .innerJoin(categories, eq(events.categoryId, categories.id))
        .where(and(...salesConditions(scope, full, filters.category)))
        .groupBy(LIMA_DAY),
      db
        .select({
          name: venueZones.name,
          tickets: sql<number>`sum(${orderItems.quantity})::int`,
        })
        .from(orders)
        .innerJoin(events, eq(orders.eventId, events.id))
        .innerJoin(categories, eq(events.categoryId, categories.id))
        .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
        .innerJoin(ticketTypes, eq(ticketTypes.id, orderItems.ticketTypeId))
        .innerJoin(venueZones, eq(venueZones.id, ticketTypes.venueZoneId))
        .where(and(...withCategory))
        .groupBy(venueZones.name),
      db
        .select({
          slug: categories.slug,
          label: categories.label,
          revenueCents: sql<number>`coalesce(sum(${orders.totalAmount}), 0)::bigint`,
        })
        .from(orders)
        .innerJoin(events, eq(orders.eventId, events.id))
        .innerJoin(categories, eq(events.categoryId, categories.id))
        .where(and(...salesConditions(scope, current)))
        .groupBy(categories.slug, categories.label)
        .orderBy(desc(sql`sum(${orders.totalAmount})`), categories.label),
      db
        .select({
          eventId: events.id,
          title: events.title,
          categoryLabel: categories.label,
          city: venues.city,
          tickets: sql<number>`coalesce(sum(${TICKETS_BY_ORDER}), 0)::int`,
          revenueCents: sql<number>`coalesce(sum(${orders.totalAmount}), 0)::bigint`,
          sold: SOLD_BY_EVENT,
          capacity: CAPACITY_BY_EVENT,
        })
        .from(orders)
        .innerJoin(events, eq(orders.eventId, events.id))
        .innerJoin(categories, eq(events.categoryId, categories.id))
        .innerJoin(venues, eq(events.venueId, venues.id))
        .where(and(...withCategory, filters.city ? eq(venues.city, filters.city) : undefined))
        .groupBy(events.id, events.title, categories.label, venues.city)
        .orderBy(desc(sql`sum(${TICKETS_BY_ORDER})`), events.title)
        .limit(TOP_EVENTS_LIMIT),
      db
        .select({ sold: SOLD_BY_EVENT, capacity: CAPACITY_BY_EVENT })
        .from(orders)
        .innerJoin(events, eq(orders.eventId, events.id))
        .innerJoin(categories, eq(events.categoryId, categories.id))
        .where(and(...withCategory))
        .groupBy(events.id),
      db
        .selectDistinct({ city: venues.city })
        .from(orders)
        .innerJoin(events, eq(orders.eventId, events.id))
        .innerJoin(categories, eq(events.categoryId, categories.id))
        .innerJoin(venues, eq(events.venueId, venues.id))
        .where(and(...withCategory))
        .orderBy(venues.city),
      filters.category
        ? db
            .select({ label: categories.label })
            .from(categories)
            .where(eq(categories.slug, filters.category))
            .limit(1)
        : Promise.resolve([] as { label: string }[]),
    ]);

  const daily = fillDailySeries(
    dailyRows.map((r) => ({
      date: r.date,
      revenueCents: Number(r.revenueCents),
      tickets: Number(r.tickets),
    })),
    periods,
  );
  const half = daily.reduce(
    (acc, p) => ({
      revenue: acc.revenue + p.revenueCents,
      tickets: acc.tickets + p.tickets,
      prevRevenue: acc.prevRevenue + p.prevRevenueCents,
      prevTickets: acc.prevTickets + p.prevTickets,
    }),
    { revenue: 0, tickets: 0, prevRevenue: 0, prevTickets: 0 },
  );

  const topEvents: TopEventRow[] = topRows.map((r) => {
    const capacity = Number(r.capacity);
    return {
      eventId: r.eventId,
      title: r.title,
      categoryLabel: r.categoryLabel,
      city: r.city,
      tickets: Number(r.tickets),
      revenueCents: Number(r.revenueCents),
      occupancy: capacity > 0 ? Math.min(Number(r.sold) / capacity, 1) : null,
    };
  });

  const categoryList: CategoryRevenue[] = categoryRows.map((r) => ({
    slug: r.slug,
    label: r.label,
    revenueCents: Number(r.revenueCents),
  }));

  return {
    periods,
    isEmpty: half.revenue === 0 && half.tickets === 0,
    kpis: {
      revenue: withDelta(half.revenue, half.prevRevenue),
      tickets: withDelta(half.tickets, half.prevTickets),
      averageTicket: withDelta(
        averageTicketCents(half.revenue, half.tickets),
        averageTicketCents(half.prevRevenue, half.prevTickets),
      ),
      occupancy: computeOccupancy(
        occupancyRows.map((r) => ({ sold: Number(r.sold), capacity: Number(r.capacity) })),
      ),
    },
    daily,
    zones: buildZoneSlices(zoneRows.map((r) => ({ name: r.name, tickets: Number(r.tickets) }))),
    categories: categoryList,
    topEvents,
    cityOptions: cityRows.map((r) => r.city),
    selectedCategoryLabel: selectedRows[0]?.label ?? null,
  };
}

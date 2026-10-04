import { asc, count, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  categories,
  organizations,
  venueSeats,
  venues,
  venueZones,
} from "@/db/schema";
import type { CurrentUser } from "@/modules/auth/services/current-user.service";
import { can } from "@/modules/auth/services/permissions";
import { EventsAccessError } from "@/modules/events/services/event-list.service";
import type { ZoneOption } from "@/modules/organizer/schemas/event-form.schema";

export interface EventFormOptions {
  organizations: { id: string; name: string }[];
  categories: { id: string; label: string }[];
  venues: {
    id: string;
    name: string;
    city: string;
    organizationId: string;
    zones: ZoneOption[];
  }[];
}

export async function getEventFormOptions(actor: CurrentUser): Promise<EventFormOptions> {
  const scope = actor.isSuperAdmin
    ? null
    : actor.memberships
        .filter((m) => can(actor, "events:manage", m.organizationId))
        .map((m) => m.organizationId);
  if (scope && scope.length === 0) throw new EventsAccessError(403);

  const [orgRows, categoryRows, venueRows] = await Promise.all([
    db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(scope ? inArray(organizations.id, scope) : undefined)
      .orderBy(asc(organizations.name), asc(organizations.id)),
    db
      .select({ id: categories.id, label: categories.label })
      .from(categories)
      .orderBy(asc(categories.label), asc(categories.id)),
    db
      .select({
        id: venues.id,
        name: venues.name,
        city: venues.city,
        organizationId: venues.organizationId,
      })
      .from(venues)
      .where(scope ? inArray(venues.organizationId, scope) : undefined)
      .orderBy(asc(venues.name), asc(venues.id)),
  ]);

  const zonesByVenue = await loadZones(venueRows.map((v) => v.id));

  return {
    organizations: orgRows,
    categories: categoryRows,
    venues: venueRows.map((v) => ({ ...v, zones: zonesByVenue.get(v.id) ?? [] })),
  };
}

/** Zonas por recinto en orden de sortOrder, con sus asientos contados en una sola consulta agrupada. */
async function loadZones(venueIds: string[]): Promise<Map<string, ZoneOption[]>> {
  const byVenue = new Map<string, ZoneOption[]>();
  if (venueIds.length === 0) return byVenue;

  const zoneRows = await db
    .select({
      id: venueZones.id,
      venueId: venueZones.venueId,
      name: venueZones.name,
      seating: venueZones.seating,
    })
    .from(venueZones)
    .where(inArray(venueZones.venueId, venueIds))
    .orderBy(asc(venueZones.sortOrder), asc(venueZones.name), asc(venueZones.id));

  const seatRows =
    zoneRows.length === 0
      ? []
      : await db
          .select({ zoneId: venueSeats.venueZoneId, seats: count() })
          .from(venueSeats)
          .where(
            inArray(
              venueSeats.venueZoneId,
              zoneRows.map((z) => z.id),
            ),
          )
          .groupBy(venueSeats.venueZoneId);
  const seatCounts = new Map(seatRows.map((s) => [s.zoneId, s.seats]));

  for (const zone of zoneRows) {
    const zones = byVenue.get(zone.venueId) ?? [];
    zones.push({
      id: zone.id,
      name: zone.name,
      seating: zone.seating,
      seats: seatCounts.get(zone.id) ?? 0,
    });
    byVenue.set(zone.venueId, zones);
  }
  return byVenue;
}

import { randomUUID } from "node:crypto";

import { and, eq, inArray, like } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { db } from "@/db";
import {
  categories,
  eventSeats,
  events,
  organizations,
  ticketTypes,
  venueSeats,
  venueZones,
  venues,
} from "@/db/schema";
import { isForeignKeyViolation, isUniqueViolation, isDivisionByZero } from "@/lib/pg-errors";
import { slugify } from "@/lib/slugify";
import type { CurrentUser } from "@/modules/auth/services/current-user.service";
import { can } from "@/modules/auth/services/permissions";
import { AdminError } from "@/modules/admin/services/admin.service";
import type { EventSaveInput } from "@/modules/organizer/schemas/event-form.schema";
import { buildEventSeatRows, chunkRows } from "@/modules/organizer/services/event-seats";
import {
  EventRuleError,
  assertPaymentsReady,
  assertPublishable,
  assertPublishedText,
  buildTicketTypeRows,
  draftGuardSql,
  nextSlug,
  requireEventColumns,
  resolveFeatured,
  type TicketTypeRow,
  type ZoneInfo,
} from "@/modules/organizer/services/event-write.mapping";

type Statement = BatchItem<"pg">;

const NOT_FOUND = "Evento no encontrado";
const DUPLICATE_TITLE = "Ya existe un evento con ese nombre";
const CHANGED_PAGE = "El evento cambió mientras lo editabas; recarga la página";
const CHANGED_RETRY = "El evento cambió, vuelve a intentarlo";

async function runBatch(statements: Statement[]): Promise<void> {
  if (statements.length === 0) return;
  await db.batch(statements as [Statement, ...Statement[]]);
}

async function translate<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof EventRuleError) throw new AdminError(error.message);
    if (isForeignKeyViolation(error)) {
      throw new AdminError("Alguna referencia del evento ya no existe");
    }
    throw error;
  }
}

/** Valida contra la base el recinto, la categoría y las zonas; nunca se confía en ids del cliente. */
async function loadZones(input: EventSaveInput, organizationId: string): Promise<ZoneInfo[]> {
  if (input.categoryId) {
    const category = await db.query.categories.findFirst({
      columns: { id: true },
      where: eq(categories.id, input.categoryId),
    });
    if (!category) throw new AdminError("La categoría no existe");
  }
  if (!input.venueId) {
    if (input.tiers.length > 0) throw new AdminError("Elige un recinto para las entradas");
    return [];
  }
  const venue = await db.query.venues.findFirst({
    columns: { id: true, organizationId: true },
    where: eq(venues.id, input.venueId),
  });
  if (!venue || venue.organizationId !== organizationId) {
    throw new AdminError("El recinto no existe o no pertenece a la organización");
  }
  return db
    .select({ id: venueZones.id, name: venueZones.name, seating: venueZones.seating })
    .from(venueZones)
    .where(eq(venueZones.venueId, venue.id));
}

async function assertOrganizationCanPublish(organizationId: string): Promise<void> {
  const organization = await db.query.organizations.findFirst({
    columns: { stripeConnectStatus: true },
    where: eq(organizations.id, organizationId),
  });
  if (!organization) throw new AdminError("Organización no encontrada");
  assertPaymentsReady(organization.stripeConnectStatus);
}

async function seatIdsByZone(zoneIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (zoneIds.length === 0) return map;
  const rows = await db
    .select({ id: venueSeats.id, zoneId: venueSeats.venueZoneId })
    .from(venueSeats)
    .where(inArray(venueSeats.venueZoneId, zoneIds));
  for (const row of rows) map.set(row.zoneId, [...(map.get(row.zoneId) ?? []), row.id]);
  return map;
}

/** Sentencias del batch: ticket_types y, para zonas numeradas, event_seats en lotes. */
async function tierStatements(
  eventId: string,
  rows: TicketTypeRow[],
  zones: ZoneInfo[],
): Promise<Statement[]> {
  if (rows.length === 0) return [];
  const numbered = rows.filter(
    (r) => zones.find((z) => z.id === r.venueZoneId)?.seating === "numbered",
  );
  const seats = await seatIdsByZone(numbered.map((r) => r.venueZoneId));
  const seatRows = numbered.flatMap((r) =>
    buildEventSeatRows({
      eventId,
      ticketTypeId: r.id,
      venueSeatIds: seats.get(r.venueZoneId) ?? [],
    }),
  );
  return [
    db.insert(ticketTypes).values(rows),
    ...chunkRows(seatRows).map((chunk) => db.insert(eventSeats).values(chunk)),
  ];
}

async function takenSlugs(base: string): Promise<string[]> {
  const rows = await db
    .select({ slug: events.slug })
    .from(events)
    .where(like(events.slug, `${base}%`));
  return rows.map((r) => r.slug);
}

export async function createEvent(
  actor: CurrentUser,
  input: EventSaveInput,
): Promise<{ id: string }> {
  if (!can(actor, "events:manage", input.organizationId)) throw new AdminError("Sin permiso");

  return translate(async () => {
    const columns = requireEventColumns(input);
    const zones = await loadZones(input, input.organizationId);
    if (input.mode === "publish") {
      assertPublishable(input, zones);
      await assertOrganizationCanPublish(input.organizationId);
    }

    const featured = resolveFeatured(can(actor, "events:feature"), input.featured);
    const eventId = randomUUID();
    const tierRows = buildTicketTypeRows({
      mode: input.mode,
      eventId,
      tiers: input.tiers,
      zones,
      newId: randomUUID,
    });
    const tierStmts = await tierStatements(eventId, tierRows, zones);
    const base = slugify(input.title);

    // Un choque de slug (carrera entre dos creaciones) se reintenta una vez con el siguiente sufijo libre.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const slug = nextSlug(base, await takenSlugs(base));
      const statements: Statement[] = [
        db.insert(events).values({
          id: eventId,
          organizationId: input.organizationId,
          venueId: columns.venueId,
          categoryId: columns.categoryId,
          title: input.title.trim(),
          slug,
          description: input.description,
          coverImageUrl: input.coverImageUrl,
          startsAt: columns.startsAt,
          status: "draft",
          ...featured,
        }),
        ...tierStmts,
      ];
      if (input.mode === "publish") {
        statements.push(
          db.update(events).set({ status: "published" }).where(eq(events.id, eventId)),
        );
      }
      try {
        await runBatch(statements);
        return { id: eventId };
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
      }
    }
    throw new AdminError(DUPLICATE_TITLE);
  });
}

export async function setEventFeatured(
  actor: CurrentUser,
  id: string,
  featured: boolean,
): Promise<void> {
  if (!can(actor, "events:feature")) throw new AdminError("Sin permiso");
  const current = await db.query.events.findFirst({
    columns: { status: true },
    where: eq(events.id, id),
  });
  if (!current) throw new AdminError(NOT_FOUND);
  if (current.status === "cancelled") {
    throw new AdminError("No se puede destacar un evento cancelado");
  }
  await db.update(events).set({ featured }).where(eq(events.id, id));
}

export async function updateEvent(
  actor: CurrentUser,
  id: string,
  input: EventSaveInput,
): Promise<void> {
  const current = await db.query.events.findFirst({
    columns: { id: true, organizationId: true, status: true },
    where: eq(events.id, id),
  });
  if (!current || !can(actor, "events:manage", current.organizationId)) {
    throw new AdminError(NOT_FOUND);
  }
  if (input.organizationId !== current.organizationId) {
    throw new AdminError("No se puede cambiar la organización del evento");
  }
  if (current.status === "cancelled") {
    throw new AdminError("No se puede editar un evento cancelado");
  }

  const featured = resolveFeatured(can(actor, "events:feature"), input.featured);

  await translate(async () => {
    if (current.status === "published") {
      assertPublishedText(input);
      await runBatch([
        db
          .update(events)
          .set({
            title: input.title.trim(),
            description: input.description,
            coverImageUrl: input.coverImageUrl,
            ...featured,
          })
          .where(and(eq(events.id, id), eq(events.status, "published"))),
      ]);
      return;
    }

    const columns = requireEventColumns(input);
    const zones = await loadZones(input, current.organizationId);
    if (input.mode === "publish") {
      assertPublishable(input, zones);
      await assertOrganizationCanPublish(current.organizationId);
    }
    const tierRows = buildTicketTypeRows({
      mode: input.mode,
      eventId: id,
      tiers: input.tiers,
      zones,
      newId: randomUUID,
    });

    const statements: Statement[] = [
      db.execute(draftGuardSql(id)),
      db
        .update(events)
        .set({
          title: input.title.trim(),
          categoryId: columns.categoryId,
          description: input.description,
          startsAt: columns.startsAt,
          venueId: columns.venueId,
          coverImageUrl: input.coverImageUrl,
          ...featured,
        })
        .where(and(eq(events.id, id), eq(events.status, "draft"))),
      db.delete(ticketTypes).where(eq(ticketTypes.eventId, id)),
      ...(await tierStatements(id, tierRows, zones)),
    ];
    if (input.mode === "publish") {
      statements.push(
        db
          .update(events)
          .set({ status: "published" })
          .where(and(eq(events.id, id), eq(events.status, "draft"))),
      );
    }
    try {
      await runBatch(statements);
    } catch (error) {
      if (isDivisionByZero(error)) throw new AdminError(CHANGED_PAGE);
      if (isUniqueViolation(error)) throw new AdminError(CHANGED_RETRY);
      throw error;
    }
  });
}

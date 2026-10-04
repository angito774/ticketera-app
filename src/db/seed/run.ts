/**
 * Seed de eventos a partir de la data mock. Asocia como organizadores (rol `organizer`) a dos usuarios
 * en organizaciones elegidas al azar, y reparte los eventos y recintos entre esas organizaciones.
 *
 *   npm run db:seed                                          usa los correos por defecto (DEFAULT_ORGANIZER_EMAILS)
 *   npm run db:seed -- --organizer-emails=a@x.com,b@x.com    sobrescribe los correos
 *   npm run db:seed -- --dry-run                             solo imprime el plan, sin tocar la base
 *
 * Los usuarios deben haber iniciado sesión al menos una vez. Quien ya tiene una membresía se respeta
 * (no se le cambia el rol). Es idempotente: lo que ya existe (categorías, recintos, eventos por slug) se reutiliza u omite.
 */
import { randomUUID } from "node:crypto";

import { config } from "dotenv";

import { chunkRows, INSERT_CHUNK } from "@/modules/organizer/services/event-seats";

import { assignOrganizers, pickRandom } from "./assign-organizers";
import { buildSeedPlan, type SeedPlan } from "./build-seed-plan";

config({ path: ".env" });

const DEFAULT_ORGANIZER_EMAILS = ["nelson.np20@gmail.com", "sistemas3610@gmail.com"];
const ORGANIZER_ROLE_ID = "organizer";

type Db = typeof import("@/db").db;
type Schema = typeof import("@/db/schema");

interface VenueMaps {
  venueId: Map<string, string>;
  zoneId: Map<string, string>; // `${venueKey}#${zoneKey}`
  seatId: Map<string, string>; // `${venueKey}#${zoneKey}#${row}-${number}`
}

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
}

function organizerEmails(): string[] {
  const raw = arg("organizer-emails");
  const emails = raw
    ? raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
    : DEFAULT_ORGANIZER_EMAILS;
  return [...new Set(emails)];
}

function printSummary(plan: SeedPlan) {
  const seats = plan.venues.reduce(
    (n, v) => n + v.zones.reduce((m, z) => m + z.seats.length, 0),
    0,
  );
  console.log(
    `Plan: ${plan.categories.length} categorías, ${plan.venues.length} recintos ` +
      `(${seats} asientos), ${plan.events.length} eventos`,
  );
  for (const e of plan.events) {
    console.log(`  - ${e.slug.padEnd(11)} ${e.title}  [${e.venueKey}]`);
  }
  console.log(`Organizadores: ${organizerEmails().join(", ")}`);
}

/** Get-or-create de los recintos, zonas y asientos físicos de una organización. */
async function ensureVenues(
  db: Db,
  s: Schema,
  plan: SeedPlan,
  organizationId: string,
): Promise<VenueMaps> {
  const { and, eq } = await import("drizzle-orm");
  const maps: VenueMaps = { venueId: new Map(), zoneId: new Map(), seatId: new Map() };

  for (const venue of plan.venues) {
    const existing = await db.query.venues.findFirst({
      where: and(
        eq(s.venues.organizationId, organizationId),
        eq(s.venues.name, venue.name),
        eq(s.venues.city, venue.city),
      ),
    });
    const [row] = existing
      ? [existing]
      : await db
          .insert(s.venues)
          .values({
            organizationId,
            name: venue.name,
            addressLine: venue.addressLine,
            city: venue.city,
          })
          .returning();
    maps.venueId.set(venue.key, row.id);

    const zoneRows = await db.select().from(s.venueZones).where(eq(s.venueZones.venueId, row.id));
    for (const zone of venue.zones) {
      const found = zoneRows.find((z) => z.name === zone.name);
      const [zoneRow] = found
        ? [found]
        : await db
            .insert(s.venueZones)
            .values({
              venueId: row.id,
              name: zone.name,
              shortName: zone.shortName,
              seating: zone.seating,
              shape: zone.shape,
              tone: zone.tone,
              sortOrder: zone.sortOrder,
            })
            .returning();
      maps.zoneId.set(`${venue.key}#${zone.key}`, zoneRow.id);

      if (zone.seats.length === 0) continue;
      for (const batch of chunkRows(zone.seats, INSERT_CHUNK)) {
        await db
          .insert(s.venueSeats)
          .values(
            batch.map((seat) => ({
              venueZoneId: zoneRow.id,
              rowLabel: seat.row,
              seatNumber: seat.number,
              x: String(seat.x),
              y: String(seat.y),
            })),
          )
          .onConflictDoNothing();
      }
      const seatRows = await db
        .select()
        .from(s.venueSeats)
        .where(eq(s.venueSeats.venueZoneId, zoneRow.id));
      for (const seat of seatRows) {
        maps.seatId.set(`${venue.key}#${zone.key}#${seat.rowLabel}-${seat.seatNumber}`, seat.id);
      }
    }
    console.log(`Recinto listo (${organizationId}): ${venue.name} (${venue.city})`);
  }
  return maps;
}

async function main() {
  const plan = buildSeedPlan();
  if (process.argv.includes("--dry-run")) {
    printSummary(plan);
    return;
  }

  const emails = organizerEmails();

  // Import dinámico: `@/db` exige DATABASE_URL al cargarse, y dotenv ya corrió.
  const { eq, inArray } = await import("drizzle-orm");
  const { db } = await import("@/db");
  const s = await import("@/db/schema");

  const userRows = await db.query.users.findMany({
    where: inArray(s.users.email, emails),
    with: { memberships: true },
  });
  const missing = emails.filter((e) => !userRows.some((u) => u.email.toLowerCase() === e));
  if (missing.length > 0) {
    throw new Error(
      `No existen usuarios con estos correos (deben iniciar sesión al menos una vez): ${missing.join(", ")}`,
    );
  }

  const organizer = await db.query.roles.findFirst({ where: eq(s.roles.id, ORGANIZER_ROLE_ID) });
  if (!organizer) {
    throw new Error(`No existe el rol "${ORGANIZER_ROLE_ID}": aplica la migración con \`npm run db:migrate\``);
  }

  let organizationIds = (await db.select({ id: s.organizations.id }).from(s.organizations)).map((o) => o.id);
  if (organizationIds.length === 0) {
    const [demo] = await db
      .insert(s.organizations)
      .values({ id: `org_${randomUUID()}`, name: "Organización demo", slug: "organizacion-demo" })
      .returning();
    organizationIds = [demo.id];
    console.log(`Organización creada: ${demo.name} (${demo.id})`);
  }

  const { memberships, targetOrganizationIds, assignments } = assignOrganizers({
    users: userRows.map((u) => ({
      id: u.id,
      email: u.email,
      organizationIds: u.memberships.map((m) => m.organizationId),
    })),
    organizationIds,
  });
  if (memberships.length > 0) {
    await db
      .insert(s.organizationMembers)
      .values(
        memberships.map((m) => ({
          id: `mem_${randomUUID()}`,
          organizationId: m.organizationId,
          userId: m.userId,
          roleId: ORGANIZER_ROLE_ID,
        })),
      )
      .onConflictDoNothing({
        target: [s.organizationMembers.organizationId, s.organizationMembers.userId],
      });
  }

  // Categorías
  await db
    .insert(s.categories)
    .values(plan.categories)
    .onConflictDoNothing({ target: s.categories.slug });
  const categoryRows = await db.select().from(s.categories);
  const categoryId = new Map(categoryRows.map((c) => [c.slug, c.id]));

  // Recintos por organización destino, creados de forma perezosa.
  const venueCache = new Map<string, VenueMaps>();
  async function venuesFor(organizationId: string): Promise<VenueMaps> {
    const cached = venueCache.get(organizationId);
    if (cached) return cached;
    const maps = await ensureVenues(db, s, plan, organizationId);
    venueCache.set(organizationId, maps);
    return maps;
  }

  // Eventos: nacen en `draft` y se publican al final, así un corte a medias se nota y no queda a la venta.
  let created = 0;
  const eventsByOrganization = new Map<string, number>();
  for (const event of plan.events) {
    const exists = await db.query.events.findFirst({ where: eq(s.events.slug, event.slug) });
    if (exists) {
      console.log(`Omitido (ya existe): ${event.slug}`);
      continue;
    }
    const organizationId = pickRandom(targetOrganizationIds);
    const { venueId, zoneId, seatId } = await venuesFor(organizationId);
    const [row] = await db
      .insert(s.events)
      .values({
        organizationId,
        venueId: venueId.get(event.venueKey)!,
        categoryId: categoryId.get(event.categorySlug)!,
        title: event.title,
        slug: event.slug,
        description: event.description,
        coverImageUrl: event.coverImageUrl,
        startsAt: event.startsAt,
        doorsOpenAt: event.doorsOpenAt,
        minAge: event.minAge,
        featured: event.featured,
        status: "draft",
      })
      .returning();

    const venue = plan.venues.find((v) => v.key === event.venueKey)!;
    const typeRows = await db
      .insert(s.ticketTypes)
      .values(
        event.ticketTypes.map((t) => ({
          eventId: row.id,
          venueZoneId: zoneId.get(`${venue.key}#${t.zoneKey}`)!,
          name: t.name,
          price: t.price,
          quantityTotal: t.quantityTotal,
          quantitySold: t.quantitySold,
        })),
      )
      .returning();

    const eventSeats = event.ticketTypes.flatMap((t) => {
      const zone = venue.zones.find((z) => z.key === t.zoneKey)!;
      const ticketTypeId = typeRows.find((r) => r.venueZoneId === zoneId.get(`${venue.key}#${zone.key}`))!.id;
      return zone.seats.map((seat) => ({
        eventId: row.id,
        venueSeatId: seatId.get(`${venue.key}#${zone.key}#${seat.row}-${seat.number}`)!,
        ticketTypeId,
        status: seat.sold ? ("sold" as const) : ("available" as const),
      }));
    });
    for (const batch of chunkRows(eventSeats, INSERT_CHUNK)) {
      await db.insert(s.eventSeats).values(batch);
    }

    await db.update(s.events).set({ status: "published" }).where(inArray(s.events.id, [row.id]));
    created += 1;
    eventsByOrganization.set(organizationId, (eventsByOrganization.get(organizationId) ?? 0) + 1);
    console.log(`Evento creado: ${event.slug} -> ${organizationId}`);
  }

  console.log(`Listo: ${created} eventos nuevos.`);
  console.log("Organizadores:");
  for (const a of assignments) {
    console.log(`  ${a.email} -> ${a.organizationId} (${a.created ? "creada" : "ya existía"})`);
  }
  console.log("Eventos por organización:");
  for (const [organizationId, count] of eventsByOrganization) {
    console.log(`  ${organizationId}: ${count}`);
  }

  try {
    const { syncRoleMetadata } = await import("@/modules/auth/services/user-sync.service");
    for (const user of userRows) await syncRoleMetadata(user.id);
    console.log("publicMetadata.role sincronizado.");
  } catch (error) {
    console.warn(
      "Advertencia: no se pudo sincronizar publicMetadata.role (Clerk no disponible fuera del runtime de Next). " +
        "El rol se reflejará en el encabezado tras el siguiente cambio de rol o login.",
    );
    console.warn(error instanceof Error ? error.message : error);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

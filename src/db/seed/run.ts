/**
 * Seed de eventos a partir de la data mock. Los eventos y recintos quedan asociados a la organización
 * del usuario indicado (debe ser admin u organizador de una organización).
 *
 *   npm run db:seed -- --organizer-email=<correo>     inserta en la base de DATABASE_URL
 *   npm run db:seed -- --dry-run                       solo imprime el resumen, sin tocar la base
 *
 * Es idempotente: lo que ya existe (categorías, recintos, eventos por slug) se reutiliza u omite.
 */
import { config } from "dotenv";

import { buildSeedPlan, type SeedPlan } from "./build-seed-plan";

config({ path: ".env" });

const CHUNK = 500;

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
}

function chunks<T>(rows: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(rows.slice(i, i + CHUNK));
  return out;
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
}

async function main() {
  const plan = buildSeedPlan();
  if (process.argv.includes("--dry-run")) {
    printSummary(plan);
    return;
  }

  const email = arg("organizer-email")?.toLowerCase();
  if (!email) throw new Error("Falta --organizer-email=<correo del organizador>");

  // Import dinámico: `@/db` exige DATABASE_URL al cargarse, y dotenv ya corrió.
  const { and, eq, inArray } = await import("drizzle-orm");
  const { db } = await import("@/db");
  const s = await import("@/db/schema");

  const user = await db.query.users.findFirst({
    where: eq(s.users.email, email),
    with: { memberships: true },
  });
  if (!user) throw new Error(`No existe un usuario con correo ${email} (debe iniciar sesión al menos una vez)`);
  const membership = user.memberships[0];
  if (!membership) throw new Error(`${email} no pertenece a ninguna organización: asígnale un rol desde /admin`);
  const organizationId = membership.organizationId;
  console.log(`Organización destino: ${organizationId} (rol ${membership.role})`);

  // Categorías
  await db
    .insert(s.categories)
    .values(plan.categories)
    .onConflictDoNothing({ target: s.categories.slug });
  const categoryRows = await db.select().from(s.categories);
  const categoryId = new Map(categoryRows.map((c) => [c.slug, c.id]));

  // Recintos, zonas y asientos físicos
  const venueId = new Map<string, string>();
  const zoneId = new Map<string, string>(); // `${venueKey}#${zoneKey}`
  const seatId = new Map<string, string>(); // `${venueKey}#${zoneKey}#${row}-${number}`
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
    venueId.set(venue.key, row.id);

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
      zoneId.set(`${venue.key}#${zone.key}`, zoneRow.id);

      if (zone.seats.length === 0) continue;
      for (const batch of chunks(zone.seats)) {
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
        seatId.set(`${venue.key}#${zone.key}#${seat.rowLabel}-${seat.seatNumber}`, seat.id);
      }
    }
    console.log(`Recinto listo: ${venue.name} (${venue.city})`);
  }

  // Eventos: nacen en `draft` y se publican al final, así un corte a medias se nota y no queda a la venta.
  let created = 0;
  for (const event of plan.events) {
    const exists = await db.query.events.findFirst({ where: eq(s.events.slug, event.slug) });
    if (exists) {
      console.log(`Omitido (ya existe): ${event.slug}`);
      continue;
    }
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
    for (const batch of chunks(eventSeats)) {
      await db.insert(s.eventSeats).values(batch);
    }

    await db.update(s.events).set({ status: "published" }).where(inArray(s.events.id, [row.id]));
    created += 1;
    console.log(`Evento creado: ${event.slug}`);
  }
  console.log(`Listo: ${created} eventos nuevos.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

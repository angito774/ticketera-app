import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, timestamps } from "./columns";
import { zoneSeating } from "./enums";
import { organizations } from "./identity";

export const categories = pgTable("categories", {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  label: text().notNull(),
  icon: text(),
  createdAt: createdAt(),
});

export const venues = pgTable(
  "venues",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: text()
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    name: text().notNull(),
    addressLine: text().notNull(),
    city: text().notNull(),
    country: text().notNull().default("PE"),
    lat: numeric({ precision: 9, scale: 6 }),
    lng: numeric({ precision: 9, scale: 6 }),
    capacity: integer(),
    ...timestamps(),
  },
  (t) => [index("venues_organization_idx").on(t.organizationId)],
);

export const venueZones = pgTable(
  "venue_zones",
  {
    id: uuid().primaryKey().defaultRandom(),
    venueId: uuid()
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    name: text().notNull(),
    shortName: text().notNull(),
    seating: zoneSeating().notNull(),
    shape: jsonb().notNull(),
    tone: smallint().notNull(),
    sortOrder: integer().notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    index("venue_zones_venue_idx").on(t.venueId),
    check("venue_zones_tone_check", sql`${t.tone} between 1 and 5`),
  ],
);

export const venueSeats = pgTable(
  "venue_seats",
  {
    id: uuid().primaryKey().defaultRandom(),
    venueZoneId: uuid()
      .notNull()
      .references(() => venueZones.id, { onDelete: "cascade" }),
    rowLabel: text().notNull(),
    seatNumber: integer().notNull(),
    x: numeric().notNull(),
    y: numeric().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("venue_seats_zone_row_number_uq").on(
      t.venueZoneId,
      t.rowLabel,
      t.seatNumber,
    ),
  ],
);

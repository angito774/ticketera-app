import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, timestamps, tstz } from "./columns";
import { discountType, seatStatus } from "./enums";
import { events } from "./events";
import { organizations, users } from "./identity";
import { venueSeats, venueZones } from "./venues";

export const ticketTypes = pgTable(
  "ticket_types",
  {
    id: uuid().primaryKey().defaultRandom(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    venueZoneId: uuid()
      .notNull()
      .references(() => venueZones.id, { onDelete: "restrict" }),
    name: text().notNull(),
    price: integer().notNull(), // centavos
    currency: text().notNull().default("PEN"),
    quantityTotal: integer(), // solo zonas general
    quantitySold: integer().notNull().default(0),
    salesStartAt: tstz(),
    salesEndAt: tstz(),
    ...timestamps(),
  },
  (t) => [
    unique("ticket_types_event_zone_uq").on(t.eventId, t.venueZoneId),
    index("ticket_types_zone_idx").on(t.venueZoneId),
    check("ticket_types_price_check", sql`${t.price} >= 0`),
    check(
      "ticket_types_quantity_check",
      sql`${t.quantitySold} >= 0 and (${t.quantityTotal} is null or ${t.quantitySold} <= ${t.quantityTotal})`,
    ),
  ],
);

export const eventSeats = pgTable(
  "event_seats",
  {
    id: uuid().primaryKey().defaultRandom(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    venueSeatId: uuid()
      .notNull()
      .references(() => venueSeats.id, { onDelete: "restrict" }),
    ticketTypeId: uuid()
      .notNull()
      .references(() => ticketTypes.id, { onDelete: "cascade" }),
    status: seatStatus().notNull().default("available"),
    ...timestamps(),
  },
  (t) => [
    unique("event_seats_event_seat_uq").on(t.eventId, t.venueSeatId),
    index("event_seats_ticket_type_status_idx").on(t.ticketTypeId, t.status),
    index("event_seats_venue_seat_idx").on(t.venueSeatId),
  ],
);

export const ticketHolds = pgTable(
  "ticket_holds",
  {
    id: uuid().primaryKey().defaultRandom(),
    ticketTypeId: uuid()
      .notNull()
      .references(() => ticketTypes.id, { onDelete: "cascade" }),
    eventSeatId: uuid().references(() => eventSeats.id, {
      onDelete: "cascade",
    }),
    quantity: integer().notNull().default(1),
    userId: text().references(() => users.id, { onDelete: "set null" }),
    expiresAt: tstz().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    // Un asiento solo puede tener un hold activo a la vez (NULL permite varios holds generales).
    unique("ticket_holds_event_seat_uq").on(t.eventSeatId),
    index("ticket_holds_ticket_type_idx").on(t.ticketTypeId),
    index("ticket_holds_user_idx").on(t.userId),
    index("ticket_holds_expires_at_idx").on(t.expiresAt),
    check("ticket_holds_quantity_check", sql`${t.quantity} > 0`),
  ],
);

export const coupons = pgTable(
  "coupons",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: text()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    eventId: uuid().references(() => events.id, { onDelete: "cascade" }),
    code: text().notNull(),
    discountType: discountType().notNull(),
    discountValue: integer().notNull(),
    maxRedemptions: integer(),
    redemptionsCount: integer().notNull().default(0),
    validFrom: tstz(),
    validUntil: tstz(),
    ...timestamps(),
  },
  (t) => [
    unique("coupons_org_code_uq").on(t.organizationId, t.code),
    index("coupons_event_idx").on(t.eventId),
    check("coupons_discount_value_check", sql`${t.discountValue} > 0`),
  ],
);

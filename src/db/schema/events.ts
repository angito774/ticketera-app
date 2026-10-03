import { boolean, index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { timestamps, tstz } from "./columns";
import { eventStatus } from "./enums";
import { organizations } from "./identity";
import { categories, venues } from "./venues";

export const events = pgTable(
  "events",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: text()
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    venueId: uuid()
      .notNull()
      .references(() => venues.id, { onDelete: "restrict" }),
    categoryId: uuid()
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    title: text().notNull(),
    slug: text().notNull().unique(),
    description: text(),
    coverImageUrl: text(),
    startsAt: tstz().notNull(),
    endsAt: tstz(),
    doorsOpenAt: tstz(),
    minAge: integer(),
    status: eventStatus().notNull().default("draft"),
    featured: boolean().notNull().default(false),
    ...timestamps(),
  },
  (t) => [
    index("events_organization_idx").on(t.organizationId),
    index("events_venue_idx").on(t.venueId),
    index("events_category_idx").on(t.categoryId),
    index("events_status_starts_at_idx").on(t.status, t.startsAt),
  ],
);

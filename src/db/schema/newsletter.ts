import { sql } from "drizzle-orm";
import { check, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt } from "./columns";

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid().primaryKey().defaultRandom(),
    email: text().notNull().unique(),
    createdAt: createdAt(),
  },
  (t) => [
    check("newsletter_subscribers_email_lower_ck", sql`${t.email} = lower(${t.email})`),
  ],
);

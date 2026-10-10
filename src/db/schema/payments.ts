import { pgTable, text } from "drizzle-orm/pg-core";
import { createdAt } from "./columns";

export const stripeEvents = pgTable("stripe_events", {
  id: text().primaryKey(), // event.id de Stripe
  type: text().notNull(),
  createdAt: createdAt(),
});

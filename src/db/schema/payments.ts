import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, timestamps, tstz } from "./columns";
import { settlementStatus } from "./enums";
import { events } from "./events";
import { organizations } from "./identity";

export const stripeEvents = pgTable("stripe_events", {
  id: text().primaryKey(), // event.id de Stripe
  type: text().notNull(),
  createdAt: createdAt(),
});

export const settlements = pgTable(
  "settlements",
  {
    id: uuid().primaryKey().defaultRandom(),
    eventId: uuid()
      .notNull()
      .unique()
      .references(() => events.id, { onDelete: "restrict" }),
    organizationId: text()
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    grossAmount: integer().notNull(), // centavos, Σ orders.total_amount
    feeAmount: integer().notNull(), // centavos, Σ orders.application_fee_amount
    payoutAmount: integer().notNull(), // centavos transferidos
    currency: text().notNull().default("PEN"),
    status: settlementStatus().notNull().default("pending"),
    attempts: integer().notNull().default(0),
    stripeTransferId: text().unique(),
    failureCode: text(),
    paidAt: tstz(),
    ...timestamps(),
  },
  (t) => [
    index("settlements_org_idx").on(t.organizationId),
    index("settlements_status_idx").on(t.status),
    check(
      "settlements_amounts_check",
      sql`${t.grossAmount} >= 0 and ${t.feeAmount} >= 0 and ${t.payoutAmount} = ${t.grossAmount} - ${t.feeAmount} and ${t.payoutAmount} >= 0`,
    ),
  ],
);

import { sql } from "drizzle-orm";
import { boolean, index, pgTable, text, unique } from "drizzle-orm/pg-core";
import { createdAt, timestamps, tstz } from "./columns";
import { orgRole, stripeConnectStatus } from "./enums";

// Copia sincronizada desde Clerk vía webhook (Clerk es la fuente de verdad).
export const users = pgTable("users", {
  id: text().primaryKey(), // Clerk user id
  email: text().notNull().unique(),
  fullName: text(),
  avatarUrl: text(),
  emailVerified: boolean().notNull().default(false),
  authProviders: text()
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  lastSignInAt: tstz(),
  isSuperAdmin: boolean().notNull().default(false),
  ...timestamps(),
});

export const organizations = pgTable("organizations", {
  id: text().primaryKey(), // Clerk organization id
  name: text().notNull(),
  slug: text().notNull().unique(),
  logoUrl: text(),
  stripeAccountId: text().unique(),
  stripeConnectStatus: stripeConnectStatus().notNull().default("not_started"),
  ...timestamps(),
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: text().primaryKey(), // Clerk membership id
    organizationId: text()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: orgRole().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("organization_members_org_user_uq").on(t.organizationId, t.userId),
    index("organization_members_user_idx").on(t.userId),
  ],
);

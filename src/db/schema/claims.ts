import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, tstz } from "./columns";

export const claimType = pgEnum("claim_type", ["claim", "complaint"]);
export const claimStatus = pgEnum("claim_status", ["received", "in_progress", "answered"]);
export const claimItemType = pgEnum("claim_item_type", ["product", "service"]);

export const claims = pgTable(
  "claims",
  {
    id: uuid().primaryKey().defaultRandom(),
    number: integer().notNull().unique().generatedAlwaysAsIdentity(),
    type: claimType().notNull(),
    status: claimStatus().notNull().default("received"),
    fullName: text().notNull(),
    documentType: text().notNull(),
    documentNumber: text().notNull(),
    address: text().notNull(),
    phone: text().notNull(),
    email: text().notNull(),
    isMinor: boolean().notNull().default(false),
    guardianFullName: text(),
    guardianDocumentType: text(),
    guardianDocumentNumber: text(),
    itemType: claimItemType().notNull(),
    itemDescription: text().notNull(),
    claimedAmountCents: integer(),
    orderReference: text(),
    detail: text().notNull(),
    consumerRequest: text().notNull(),
    dueDate: date({ mode: "string" }).notNull(),
    createdAt: createdAt(),
    response: text(),
    answeredAt: tstz(),
  },
  (t) => [
    index("claims_email_created_at_idx").on(t.email, t.createdAt),
    check("claims_email_lower_ck", sql`${t.email} = lower(${t.email})`),
    check(
      "claims_guardian_required_ck",
      sql`${t.isMinor} = false or (${t.guardianFullName} is not null and ${t.guardianDocumentType} is not null and ${t.guardianDocumentNumber} is not null)`,
    ),
    check(
      "claims_detail_len_ck",
      sql`char_length(${t.detail}) <= 2000 and char_length(${t.consumerRequest}) <= 1000`,
    ),
  ],
);

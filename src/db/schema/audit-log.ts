import { index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt } from "./columns";

export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: uuid().primaryKey().defaultRandom(),
    createdAt: createdAt(),
    actorUserId: text().notNull(),
    impersonatedUserId: text(),
    action: text().notNull(),
    targetType: text(),
    targetId: text(),
    organizationId: text(),
    input: jsonb(),
    result: text().notNull(),
    errorCode: text(),
    metadata: jsonb(),
  },
  (t) => [
    index("admin_audit_log_created_at_idx").on(t.createdAt),
    index("admin_audit_log_actor_idx").on(t.actorUserId, t.createdAt),
    index("admin_audit_log_action_idx").on(t.action),
  ],
);

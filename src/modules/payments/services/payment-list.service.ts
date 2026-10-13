import { desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { events, orders, organizations, users } from "@/db/schema";
import { AdminError } from "@/modules/admin/services/admin.service";
import type { CurrentUser } from "@/modules/auth/services/current-user.service";
import { can } from "@/modules/auth/services/permissions";
import type { PaymentRow } from "@/modules/payments/types/payments-admin.types";

const LIST_LIMIT = 100;

/** Pagos de compradores: órdenes cobradas (`paid`) y las ya reembolsadas (`refunded`), las más recientes primero. */
export async function listPayments(actor: CurrentUser): Promise<PaymentRow[]> {
  if (!can(actor, "organizations:manage")) throw new AdminError("Sin permiso");
  const rows = await db
    .select({
      orderId: orders.id,
      eventTitle: events.title,
      organizationName: organizations.name,
      buyerEmail: users.email,
      amount: orders.totalAmount,
      status: orders.status,
      settlementId: orders.settlementId,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .innerJoin(events, eq(events.id, orders.eventId))
    .innerJoin(organizations, eq(organizations.id, events.organizationId))
    .innerJoin(users, eq(users.id, orders.userId))
    .where(inArray(orders.status, ["paid", "refunded"]))
    .orderBy(desc(orders.updatedAt))
    .limit(LIST_LIMIT);

  return rows.map((row) => ({
    orderId: row.orderId,
    eventTitle: row.eventTitle,
    organizationName: row.organizationName,
    buyerEmail: row.buyerEmail,
    amount: row.amount,
    status: row.status as PaymentRow["status"],
    settled: row.settlementId !== null,
    date: row.updatedAt,
  }));
}

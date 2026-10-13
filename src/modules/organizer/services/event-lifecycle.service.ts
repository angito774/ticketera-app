import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { events, orders } from "@/db/schema";
import { isForeignKeyViolation } from "@/lib/pg-errors";
import { AdminError } from "@/modules/admin/services/admin.service";
import type { CurrentUser } from "@/modules/auth/services/current-user.service";
import { can } from "@/modules/auth/services/permissions";
import {
  canCancelEvent,
  canDeleteEvent,
} from "@/modules/organizer/services/event-lifecycle.rules";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_FOUND = "Evento no encontrado";
const HAS_SALES = "Este evento tiene ventas; cancélalo en lugar de eliminarlo";
const NOT_PUBLISHED = "Solo se pueden cancelar eventos publicados";

/** 404 uniforme: id inválido, inexistente o de otra organización responden igual. */
async function loadManagedEvent(actor: CurrentUser, id: string) {
  if (!UUID_RE.test(id)) throw new AdminError(NOT_FOUND);
  const current = await db.query.events.findFirst({
    columns: { id: true, organizationId: true, status: true },
    where: eq(events.id, id),
  });
  if (!current || !can(actor, "events:manage", current.organizationId)) {
    throw new AdminError(NOT_FOUND);
  }
  return current;
}

async function countOrders(eventId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(eq(orders.eventId, eventId));
  return row?.count ?? 0;
}

export async function deleteEvent(actor: CurrentUser, id: string): Promise<void> {
  const current = await loadManagedEvent(actor, id);
  const orderCount = await countOrders(current.id);
  if (!canDeleteEvent({ status: current.status, orderCount })) throw new AdminError(HAS_SALES);

  try {
    // Un solo DELETE condicional es atómico; la FK restrict cubre la carrera con una compra.
    await db
      .delete(events)
      .where(
        and(
          eq(events.id, current.id),
          sql`not exists (select 1 from ${orders} where ${orders.eventId} = ${events.id})`,
        ),
      );
  } catch (error) {
    if (isForeignKeyViolation(error)) throw new AdminError(HAS_SALES);
    throw error;
  }
}

export async function cancelEvent(actor: CurrentUser, id: string): Promise<void> {
  const current = await loadManagedEvent(actor, id);
  if (!canCancelEvent({ status: current.status })) throw new AdminError(NOT_PUBLISHED);

  const updated = await db
    .update(events)
    .set({ status: "cancelled", featured: false })
    .where(and(eq(events.id, current.id), eq(events.status, "published")))
    .returning({ id: events.id });
  if (updated.length === 0) throw new AdminError(NOT_PUBLISHED);
}

import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { events, ticketTypes, venueZones } from "@/db/schema";
import type { CurrentUser } from "@/modules/auth/services/current-user.service";
import { can } from "@/modules/auth/services/permissions";
import type { EventFormValues } from "@/modules/organizer/schemas/event-form.schema";
import {
  buildTierValues,
  toLimaDateTimeParts,
} from "@/modules/organizer/services/event-edit.mapping";

export interface EventEditData {
  id: string;
  organizationId: string;
  status: "draft" | "published" | "cancelled";
  slug: string;
  values: EventFormValues;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `null` cubre id inválido, evento inexistente y falta de permiso por igual (404 uniforme). */
export async function getEventForEdit(
  actor: CurrentUser,
  id: string,
): Promise<EventEditData | null> {
  if (!UUID_RE.test(id)) return null;

  const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  if (!event || !can(actor, "events:manage", event.organizationId)) return null;

  const [zones, types] = await Promise.all([
    db
      .select({ id: venueZones.id })
      .from(venueZones)
      .where(eq(venueZones.venueId, event.venueId))
      .orderBy(asc(venueZones.sortOrder), asc(venueZones.name), asc(venueZones.id)),
    db
      .select({
        venueZoneId: ticketTypes.venueZoneId,
        price: ticketTypes.price,
        quantityTotal: ticketTypes.quantityTotal,
      })
      .from(ticketTypes)
      .where(eq(ticketTypes.eventId, event.id)),
  ]);

  const { date, time } = toLimaDateTimeParts(event.startsAt);

  return {
    id: event.id,
    organizationId: event.organizationId,
    status: event.status,
    slug: event.slug,
    values: {
      title: event.title,
      categoryId: event.categoryId,
      description: event.description ?? "",
      date,
      time,
      venueId: event.venueId,
      coverImageUrl: event.coverImageUrl ?? "",
      organizationId: event.organizationId,
      featured: event.featured,
      tiers: buildTierValues(zones, types),
    },
  };
}

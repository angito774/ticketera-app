import { and, asc, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { eventSeats, events, ticketTypes, venueSeats, venueZones } from "@/db/schema";
import {
  mapRemainingByZone,
  mapSoldSeatIds,
} from "@/modules/checkout/services/order-read.mapping";
import { getEventById } from "@/modules/events/services/events.service";
import type { EventAvailability } from "@/modules/tickets/services/availability-overlay";
import { getVenueLayout } from "@/modules/tickets/services/venues.service";

/** null si el evento no existe, no está publicado o no está en el catálogo con layout. */
export async function getEventAvailability(slug: string): Promise<EventAvailability | null> {
  const detail = getEventById(slug);
  if (!detail) return null;

  const [event] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.slug, slug), eq(events.status, "published")))
    .limit(1);
  if (!event) return null;

  const [types, soldSeats] = await Promise.all([
    db
      .select({
        zoneName: venueZones.name,
        quantityTotal: ticketTypes.quantityTotal,
        quantitySold: ticketTypes.quantitySold,
      })
      .from(ticketTypes)
      .innerJoin(venueZones, eq(ticketTypes.venueZoneId, venueZones.id))
      .where(eq(ticketTypes.eventId, event.id)),
    db
      .select({
        zoneName: venueZones.name,
        rowLabel: venueSeats.rowLabel,
        seatNumber: venueSeats.seatNumber,
      })
      .from(eventSeats)
      .innerJoin(venueSeats, eq(eventSeats.venueSeatId, venueSeats.id))
      .innerJoin(venueZones, eq(venueSeats.venueZoneId, venueZones.id))
      .where(and(eq(eventSeats.eventId, event.id), ne(eventSeats.status, "available")))
      .orderBy(asc(venueZones.name), asc(venueSeats.rowLabel), asc(venueSeats.seatNumber)),
  ]);

  const layout = getVenueLayout(detail.layoutId, detail.price);
  return {
    soldSeatIds: mapSoldSeatIds(layout, soldSeats),
    remainingByZone: mapRemainingByZone(layout, types),
  };
}

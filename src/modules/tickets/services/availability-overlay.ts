import { MAX_TICKETS_PER_ZONE } from "@/modules/tickets/services/venues.service";
import type { PurchaseSelection } from "@/modules/tickets/store/purchase.store";
import type { VenueLayout, VenueZone } from "@/modules/tickets/types/venue.types";

export interface EventAvailability {
  soldSeatIds: string[];
  /** null = zona numerada / sin tope. */
  remainingByZone: Record<string, number | null>;
}

export interface UnavailableSelection {
  seats: Record<string, string[]>;
  zones: string[];
}

function remainingOf(availability: EventAvailability, zoneId: string): number | null {
  return availability.remainingByZone[zoneId] ?? null;
}

/** Máximo de entradas que se pueden elegir en una zona general según el cupo real. */
export function getZoneMaxTickets(availability: EventAvailability | null, zoneId: string): number {
  const remaining = availability ? remainingOf(availability, zoneId) : null;
  return remaining === null ? MAX_TICKETS_PER_ZONE : Math.max(0, Math.min(remaining, MAX_TICKETS_PER_ZONE));
}

function overlayZone(zone: VenueZone, sold: Set<string>, availability: EventAvailability): VenueZone {
  if (zone.seating === "numbered") {
    const rows = zone.rows.map((row) => ({
      ...row,
      seats: row.seats.map((seat) =>
        sold.has(seat.id) ? { ...seat, status: "taken" as const } : { ...seat }
      ),
    }));
    const allTaken = rows.length > 0 && rows.every((row) => row.seats.every((s) => s.status === "taken"));
    return { ...zone, rows, status: allTaken ? "sold-out" : zone.status };
  }

  const remaining = remainingOf(availability, zone.id);
  if (remaining === null) return { ...zone, rows: [] };
  if (remaining <= 0) return { ...zone, rows: [], status: "sold-out" };
  return {
    ...zone,
    rows: [],
    status: zone.status === "sold-out" ? zone.status : remaining <= MAX_TICKETS_PER_ZONE ? "last-tickets" : zone.status,
  };
}

/** Copia del layout con asientos vendidos como "taken" y zonas generales agotadas/limitadas. No muta el original. */
export function applyAvailability(layout: VenueLayout, availability: EventAvailability): VenueLayout {
  const sold = new Set(availability.soldSeatIds);
  return { ...layout, zones: layout.zones.map((zone) => overlayZone(zone, sold, availability)) };
}

/** Asientos y zonas de la selección que ya no están disponibles. */
export function findUnavailableSelection(
  selection: PurchaseSelection,
  availability: EventAvailability
): UnavailableSelection {
  const sold = new Set(availability.soldSeatIds);
  const seats: Record<string, string[]> = {};
  for (const [zoneId, ids] of Object.entries(selection.seats)) {
    const gone = ids.filter((id) => sold.has(id));
    if (gone.length) seats[zoneId] = gone;
  }

  const zones = Object.entries(selection.quantities)
    .filter(([zoneId, quantity]) => {
      const remaining = remainingOf(availability, zoneId);
      return quantity > 0 && remaining !== null && quantity > remaining;
    })
    .map(([zoneId]) => zoneId);

  return { seats, zones };
}

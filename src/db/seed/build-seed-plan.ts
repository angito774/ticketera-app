import {
  EVENT_CATEGORY_LABELS,
  type EventCategory,
} from "@/modules/events/types/event.types";
import {
  getAllEvents,
  getEventById,
} from "@/modules/events/services/events.service";
import { getVenueLayout } from "@/modules/tickets/services/venues.service";
import type { VenueLayoutId } from "@/modules/tickets/types/venue.types";

/** Capacidad de las zonas generales (el mock no la define). */
const GENERAL_CAPACITY: Record<string, number> = {
  vip: 500,
  general: 3000,
  norte: 2000,
};
const DEFAULT_GENERAL_CAPACITY = 1000;

const CATEGORY_ICONS: Record<EventCategory, string> = {
  concert: "Music",
  theater: "Drama",
};

export interface SeedSeat {
  row: string;
  number: number;
  x: number;
  y: number;
  sold: boolean;
}

export interface SeedZone {
  key: string; // layout zone id, ej. "occidente"
  name: string;
  shortName: string;
  seating: "general" | "numbered";
  tone: number;
  sortOrder: number;
  shape: unknown; // geometría lógica del mapa SVG
  seats: SeedSeat[];
}

export interface SeedVenue {
  key: string;
  name: string;
  addressLine: string;
  city: string;
  layoutId: VenueLayoutId;
  zones: SeedZone[];
}

export interface SeedTicketType {
  zoneKey: string;
  name: string;
  price: number; // centavos
  quantityTotal: number | null; // solo zonas generales
  quantitySold: number;
}

export interface SeedEvent {
  slug: string;
  title: string;
  categorySlug: EventCategory;
  venueKey: string;
  description: string;
  coverImageUrl: string;
  startsAt: Date;
  doorsOpenAt: Date;
  minAge: number | null;
  featured: boolean;
  ticketTypes: SeedTicketType[];
}

export interface SeedPlan {
  categories: { slug: EventCategory; label: string; icon: string }[];
  venues: SeedVenue[];
  events: SeedEvent[];
}

const venueKeyOf = (venue: string, city: string) => `${venue}|${city}`;

/** Convierte la data mock de eventos y recintos en filas listas para insertar. Sin acceso a la DB. */
export function buildSeedPlan(): SeedPlan {
  const venues = new Map<string, SeedVenue>();
  const events: SeedEvent[] = [];

  for (const base of getAllEvents()) {
    const detail = getEventById(base.id);
    if (!detail) throw new Error(`Missing detail for mock event ${base.id}`);

    const venueKey = venueKeyOf(detail.venue, detail.city);
    const layout = getVenueLayout(detail.layoutId, detail.price);

    const known = venues.get(venueKey);
    if (known && known.layoutId !== detail.layoutId) {
      throw new Error(`Venue ${venueKey} is used with two different layouts`);
    }
    if (!known) {
      venues.set(venueKey, {
        key: venueKey,
        name: detail.venue,
        addressLine: detail.address,
        city: detail.city,
        layoutId: detail.layoutId,
        zones: layout.zones.map((zone, index) => ({
          key: zone.id,
          name: zone.name,
          shortName: zone.shortName,
          seating: zone.seating,
          tone: zone.tone,
          sortOrder: index,
          shape: zone.shape.geometry,
          seats: zone.rows.flatMap((row) =>
            row.seats.map((seat) => ({
              row: seat.row,
              number: seat.number,
              x: seat.x,
              y: seat.y,
              sold: seat.status === "taken",
            })),
          ),
        })),
      });
    }

    events.push({
      slug: detail.id,
      title: detail.title,
      categorySlug: detail.category,
      venueKey,
      description: detail.description,
      coverImageUrl: detail.imageUrl,
      startsAt: new Date(detail.date),
      doorsOpenAt: new Date(detail.doorsOpenAt),
      minAge: detail.minAge,
      featured: detail.featured,
      ticketTypes: layout.zones.map((zone) => {
        const numbered = zone.seating === "numbered";
        const total = numbered
          ? null
          : (GENERAL_CAPACITY[zone.id] ?? DEFAULT_GENERAL_CAPACITY);
        const sold = numbered
          ? zone.rows.flatMap((r) => r.seats).filter((s) => s.status === "taken")
              .length
          : zone.status === "sold-out"
            ? (total as number)
            : zone.status === "last-tickets"
              ? Math.floor((total as number) * 0.9)
              : 0;
        return {
          zoneKey: zone.id,
          name: zone.name,
          price: zone.price * 100,
          quantityTotal: total,
          quantitySold: sold,
        };
      }),
    });
  }

  const usedCategories = [...new Set(events.map((e) => e.categorySlug))];
  return {
    categories: usedCategories.map((slug) => ({
      slug,
      label: EVENT_CATEGORY_LABELS[slug].plural,
      icon: CATEGORY_ICONS[slug],
    })),
    venues: [...venues.values()],
    events,
  };
}

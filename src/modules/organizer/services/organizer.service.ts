import { getEventById } from "@/modules/events/services/events.service";
import type {
  OrganizerEvent,
  OrganizerEventFilter,
  TicketTier,
} from "@/modules/organizer/types/organizer.types";

/** Publica un evento del catálogo como evento del organizador, con su reparto de entradas mock. */
function fromCatalog(eventId: string, tiers: TicketTier[]): OrganizerEvent {
  const event = getEventById(eventId)!;
  return {
    id: event.id,
    catalogEventId: event.id,
    status: "published",
    title: event.title,
    category: event.category,
    description: event.description,
    startsAt: event.date,
    venue: event.venue,
    city: event.city,
    imageUrl: event.imageUrl,
    tiers,
  };
}

/** Eventos de ejemplo del organizador (datos mock): 4 publicados y 1 borrador. */
export const ORGANIZER_EVENTS: OrganizerEvent[] = [
  fromCatalog("concert-02", [
    { name: "Platea", price: 270, quantity: 600, sold: 548 },
    { name: "Balcón", price: 180, quantity: 400, sold: 352 },
  ]),
  fromCatalog("concert-05", [
    { name: "General", price: 150, quantity: 800, sold: 214 },
    { name: "Preferencial", price: 230, quantity: 200, sold: 96 },
  ]),
  fromCatalog("theater-02", [
    { name: "Platea", price: 135, quantity: 300, sold: 287 },
    { name: "Mezzanine", price: 90, quantity: 120, sold: 25 },
  ]),
  fromCatalog("theater-03", [{ name: "General", price: 130, quantity: 1200, sold: 414 }]),
  {
    id: "draft-feria-verano",
    catalogEventId: null,
    status: "draft",
    title: "Feria Familiar de Verano",
    category: "theater",
    description: "Juegos, títeres y funciones para toda la familia durante un fin de semana al aire libre.",
    startsAt: "2027-02-06T11:00:00-05:00",
    venue: "Parque Selva Alegre",
    city: "Arequipa",
    imageUrl: null,
    tiers: [
      { name: "Niños", price: 25, quantity: 800, sold: 0 },
      { name: "Adultos", price: 40, quantity: 700, sold: 0 },
    ],
  },
];

export interface EventTotals {
  sold: number;
  capacity: number;
  revenue: number;
  /** Menor precio mayor a 0, o null si no hay precios. */
  fromPrice: number | null;
}

export function getEventTotals(event: OrganizerEvent): EventTotals {
  const prices = event.tiers.map((tier) => tier.price).filter((price) => price > 0);
  return {
    sold: event.tiers.reduce((sum, tier) => sum + tier.sold, 0),
    capacity: event.tiers.reduce((sum, tier) => sum + tier.quantity, 0),
    revenue: event.tiers.reduce((sum, tier) => sum + tier.sold * tier.price, 0),
    fromPrice: prices.length ? Math.min(...prices) : null,
  };
}

export function getOrganizerSummary(events: OrganizerEvent[]): { sold: number; revenue: number; published: number } {
  return events.reduce(
    (summary, event) => {
      const totals = getEventTotals(event);
      return {
        sold: summary.sold + totals.sold,
        revenue: summary.revenue + totals.revenue,
        published: summary.published + (event.status === "published" ? 1 : 0),
      };
    },
    { sold: 0, revenue: 0, published: 0 }
  );
}

export function filterOrganizerEvents(events: OrganizerEvent[], filter: OrganizerEventFilter): OrganizerEvent[] {
  return filter === "all" ? events : events.filter((event) => event.status === filter);
}

/** Los eventos guardados reemplazan a los mock con el mismo id; orden por fecha y los sin fecha al final. */
export function mergeOrganizerEvents(mock: OrganizerEvent[], saved: OrganizerEvent[]): OrganizerEvent[] {
  const byId = new Map(mock.map((event) => [event.id, event]));
  saved.forEach((event) => byId.set(event.id, event));
  const time = (event: OrganizerEvent) =>
    event.startsAt ? new Date(event.startsAt).getTime() : Number.POSITIVE_INFINITY;
  return [...byId.values()].sort((a, b) => time(a) - time(b));
}

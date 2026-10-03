import type { Event, EventCategory } from "@/modules/events/types/event.types";

export const PLACEHOLDER_EVENT_IMAGE_URL =
  "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80";

const LIMA_OFFSET_HOURS = 5;
const HOUR_MS = 3_600_000;

/** ISO 8601 con offset de Lima (-05:00, sin horario de verano), como asume el resto de la app. */
export function toLimaIso(date: Date): string {
  const shifted = new Date(date.getTime() - LIMA_OFFSET_HOURS * HOUR_MS);
  return `${shifted.toISOString().slice(0, 19)}-05:00`;
}

/** Rango [inicio, fin) del mes "YYYY-MM" en hora de Lima. */
export function limaMonthRange(month: string): { start: Date; end: Date } {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1, LIMA_OFFSET_HOURS)),
    end: new Date(Date.UTC(year, monthNumber, 1, LIMA_OFFSET_HOURS)),
  };
}

const monthLabelFormatter = new Intl.DateTimeFormat("es-PE", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function monthLabel(key: string): string {
  const label = monthLabelFormatter.format(new Date(`${key}-15T12:00:00Z`)).replace(" de ", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export interface PublicEventRow {
  slug: string;
  title: string;
  categorySlug: string;
  startsAt: Date;
  venueName: string;
  city: string;
  minPriceCents: number | null;
  coverImageUrl: string | null;
  featured: boolean;
}

export function mapPublicEvent(row: PublicEventRow): Event {
  return {
    id: row.slug,
    title: row.title,
    category: row.categorySlug as EventCategory,
    date: toLimaIso(row.startsAt),
    venue: row.venueName,
    city: row.city,
    price: (row.minPriceCents ?? 0) / 100,
    imageUrl: row.coverImageUrl ?? PLACEHOLDER_EVENT_IMAGE_URL,
    featured: row.featured,
  };
}

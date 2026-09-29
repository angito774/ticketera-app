export type EventCategory = "concert" | "theater";

export interface Event {
  id: string;
  title: string;
  category: EventCategory;
  date: string; // ISO 8601 con offset, ej. "2026-11-14T20:00:00-05:00"
  venue: string;
  city: string;
  price: number; // soles (PEN), sin símbolo
  imageUrl: string; // host images.unsplash.com
  featured: boolean;
}

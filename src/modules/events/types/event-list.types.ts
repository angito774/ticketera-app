import type { Event, EventCategory } from "@/modules/events/types/event.types";

export interface PublicEventList {
  events: Event[];
  total: number;
  page: number;
  pageCount: number;
}

export interface OrganizerEventTier {
  id: string;
  name: string;
  /** soles */
  price: number;
  quantity: number;
  sold: number;
}

export interface OrganizerEventRow {
  id: string;
  slug: string;
  status: "draft" | "published" | "cancelled";
  title: string;
  category: EventCategory | null;
  description: string | null;
  startsAt: string;
  venue: string;
  city: string;
  imageUrl: string | null;
  tiers: OrganizerEventTier[];
  sold: number;
  capacity: number;
  /** soles */
  revenue: number;
  /** soles; menor precio > 0 */
  fromPrice: number | null;
}

export interface OrganizerSummary {
  sold: number;
  /** soles */
  revenue: number;
  published: number;
  total: number;
}

export interface OrganizerEventList {
  events: OrganizerEventRow[];
  total: number;
  page: number;
  pageCount: number;
  summary: OrganizerSummary;
}

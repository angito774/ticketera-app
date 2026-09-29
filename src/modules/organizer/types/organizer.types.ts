import type { EventCategory } from "@/modules/events/types/event.types";

export type OrganizerEventStatus = "published" | "draft";

export type OrganizerEventFilter = "all" | OrganizerEventStatus;

export interface TicketTier {
  name: string;
  /** Soles (PEN). */
  price: number;
  quantity: number;
  sold: number;
}

export interface OrganizerEvent {
  /** Mock: id del catálogo o "draft-…"; creados en el panel: "org-<timestamp>". */
  id: string;
  /** Evento público equivalente, para "Ver evento" (null si no está en el catálogo). */
  catalogEventId: string | null;
  status: OrganizerEventStatus;
  title: string;
  category: EventCategory | null;
  description: string;
  /** ISO 8601 con offset -05:00, o null si aún no tiene fecha. */
  startsAt: string | null;
  venue: string;
  city: string;
  imageUrl: string | null;
  tiers: TicketTier[];
}

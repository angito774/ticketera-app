export interface LegalLink {
  label: string;
  /** Destino interno. */
  href: string;
}

export interface LegalSection {
  /** Id estable y único dentro del documento (slug); se usa para aria-labelledby. */
  id: string;
  /** Sin número: LegalPage numera por posición. */
  title: string;
  paragraphs: string[];
  items?: string[];
  links?: LegalLink[];
}

export interface LegalDocument {
  title: string;
  intro?: string;
  /** Nota de pie, p. ej. "Ticketera es una marca de TicketYa.com". */
  notice?: string;
  /** ISO 8601 con offset de Lima (evita corrimiento de día en formatDate): "2026-10-07T12:00:00-05:00". */
  updatedAt: string;
  sections: LegalSection[];
}

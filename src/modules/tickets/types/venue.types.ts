export type VenueLayoutId = "stadium" | "theater";

export type ZoneSeating = "general" | "numbered";

export type ZoneStatus = "available" | "last-tickets" | "sold-out";

export type SeatStatus = "available" | "taken";

/** Nivel de precio de la zona en el mapa: 1 = más cara. */
export type ZoneTone = 1 | 2 | 3 | 4 | 5;

/** Rectángulo en unidades del viewBox del SVG del recinto o de la zona. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Seat {
  id: string;
  row: string;
  number: number;
  status: SeatStatus;
  /** Centro del asiento en el viewBox de `SeatMap`. */
  x: number;
  y: number;
}

export interface SeatRow {
  label: string;
  seats: Seat[];
}

export interface VenueZone {
  id: string;
  name: string;
  /** Etiqueta corta para el mapa en móvil ("Occidente"). */
  shortName: string;
  /** Soles (PEN), ya calculado para el evento. */
  price: number;
  status: ZoneStatus;
  seating: ZoneSeating;
  tone: ZoneTone;
  shape: Rect;
  /** Vacío en zonas generales. */
  rows: SeatRow[];
}

export interface VenueLayout {
  id: VenueLayoutId;
  viewBox: { width: number; height: number };
  stage: Rect;
  zones: VenueZone[];
}

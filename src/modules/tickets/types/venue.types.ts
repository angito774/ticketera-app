export type VenueLayoutId = "stadium" | "theater";

export type ZoneSeating = "general" | "numbered";

export type ZoneStatus = "available" | "last-tickets" | "sold-out";

export type SeatStatus = "available" | "taken";

/** Nivel de precio de la zona en el mapa: 1 = más cara. */
export type ZoneTone = 1 | 2 | 3 | 4 | 5;

export interface Point {
  x: number;
  y: number;
}

/** Rectángulo en unidades del viewBox del SVG del recinto o de la zona. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Forma lógica de una zona: rectángulo redondeado o banda de anillo (tribuna curva). Ángulos en grados, 90° = abajo. */
export type ShapeGeometry =
  | { kind: "rect"; rect: Rect; radius: number }
  | {
      kind: "arc";
      cx: number;
      cy: number;
      innerRadius: number;
      outerRadius: number;
      startAngle: number;
      endAngle: number;
    };

/** Contorno listo para dibujar, derivado de `geometry`. */
export interface ZoneShape {
  geometry: ShapeGeometry;
  /** "d" de un <path> SVG. */
  path: string;
  label: Point;
  bounds: Rect;
}

export interface Seat {
  id: string;
  row: string;
  number: number;
  status: SeatStatus;
  /** Centro de la butaca en el viewBox de `SeatMap`. */
  x: number;
  y: number;
  /** Rotación (grados) para que la butaca mire al escenario. */
  angle: number;
}

export interface SeatRow {
  label: string;
  seats: Seat[];
  /** Posiciones de la etiqueta de fila a la izquierda y a la derecha de sus asientos. */
  labelPositions: [Point, Point];
}

export interface VenueZone {
  id: string;
  name: string;
  /** Etiqueta corta para zonas angostas ("Occidente"). */
  shortName: string;
  /** Soles (PEN), ya calculado para el evento. */
  price: number;
  status: ZoneStatus;
  seating: ZoneSeating;
  tone: ZoneTone;
  shape: ZoneShape;
  /** Vacío en zonas generales. */
  rows: SeatRow[];
}

export interface VenueLayout {
  id: VenueLayoutId;
  viewBox: { width: number; height: number };
  stage: ZoneShape;
  zones: VenueZone[];
}

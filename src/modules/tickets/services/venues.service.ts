import type {
  Rect,
  Seat,
  SeatRow,
  VenueLayout,
  VenueLayoutId,
  VenueZone,
  ZoneSeating,
  ZoneStatus,
  ZoneTone,
} from "@/modules/tickets/types/venue.types";

export const MAX_TICKETS_PER_ZONE = 6;

/** Separación entre asientos y entre filas, en unidades del viewBox de `SeatMap`. */
export const SEAT_SPACING = 24;
export const ROW_SPACING = 28;
/** Espacio a la izquierda de cada fila para su etiqueta. */
export const ROW_LABEL_GUTTER = 32;

interface ZoneTemplate {
  id: string;
  name: string;
  shortName: string;
  /** La zona disponible más barata de cada layout usa 1, así su precio coincide con el "desde" del evento. */
  priceMultiplier: number;
  status: ZoneStatus;
  seating: ZoneSeating;
  tone: ZoneTone;
  shape: Rect;
  /** Solo zonas numeradas: etiqueta de fila → cantidad de asientos. */
  rows?: [label: string, seats: number][];
}

interface LayoutTemplate {
  viewBox: VenueLayout["viewBox"];
  stage: Rect;
  zones: ZoneTemplate[];
}

const rowsOf = (labels: string, seats: number): [string, number][] =>
  labels.split("").map((label) => [label, seats]);

const LAYOUTS: Record<VenueLayoutId, LayoutTemplate> = {
  stadium: {
    viewBox: { width: 400, height: 300 },
    stage: { x: 90, y: 0, width: 220, height: 34 },
    zones: [
      {
        id: "vip",
        name: "Campo VIP",
        shortName: "VIP",
        priceMultiplier: 2.76,
        status: "sold-out",
        seating: "general",
        tone: 1,
        shape: { x: 90, y: 42, width: 220, height: 80 },
      },
      {
        id: "general",
        name: "Campo General",
        shortName: "General",
        priceMultiplier: 1.8,
        status: "available",
        seating: "general",
        tone: 2,
        shape: { x: 90, y: 130, width: 220, height: 100 },
      },
      {
        id: "occidente",
        name: "Tribuna Occidente",
        shortName: "Occidente",
        priceMultiplier: 1.52,
        status: "last-tickets",
        seating: "numbered",
        tone: 3,
        shape: { x: 0, y: 0, width: 82, height: 230 },
        rows: rowsOf("ABCDEFGH", 14),
      },
      {
        id: "oriente",
        name: "Tribuna Oriente",
        shortName: "Oriente",
        priceMultiplier: 1.28,
        status: "available",
        seating: "numbered",
        tone: 4,
        shape: { x: 318, y: 0, width: 82, height: 230 },
        rows: rowsOf("ABCDEFGH", 14),
      },
      {
        id: "norte",
        name: "Tribuna Norte",
        shortName: "Norte",
        priceMultiplier: 1,
        status: "available",
        seating: "general",
        tone: 5,
        shape: { x: 0, y: 238, width: 400, height: 62 },
      },
    ],
  },
  theater: {
    viewBox: { width: 400, height: 300 },
    stage: { x: 60, y: 0, width: 280, height: 34 },
    zones: [
      {
        id: "preferencial",
        name: "Platea Preferencial",
        shortName: "Preferencial",
        priceMultiplier: 2,
        status: "last-tickets",
        seating: "numbered",
        tone: 1,
        shape: { x: 60, y: 42, width: 280, height: 52 },
        rows: [
          ["A", 12],
          ["B", 14],
          ["C", 14],
        ],
      },
      {
        id: "platea",
        name: "Platea",
        shortName: "Platea",
        priceMultiplier: 1.5,
        status: "available",
        seating: "numbered",
        tone: 2,
        shape: { x: 40, y: 102, width: 320, height: 80 },
        rows: rowsOf("DEFGH", 18),
      },
      {
        id: "mezzanine",
        name: "Mezzanine",
        shortName: "Mezzanine",
        priceMultiplier: 1.2,
        status: "available",
        seating: "numbered",
        tone: 3,
        shape: { x: 20, y: 190, width: 360, height: 48 },
        rows: rowsOf("JKL", 20),
      },
      {
        id: "balcon",
        name: "Balcón",
        shortName: "Balcón",
        priceMultiplier: 1,
        status: "available",
        seating: "numbered",
        tone: 4,
        shape: { x: 0, y: 246, width: 400, height: 54 },
        rows: rowsOf("MNO", 22),
      },
    ],
  },
};

/** Generador pseudoaleatorio con semilla (LCG): mismos asientos ocupados en cada llamada. */
function seededRandom(seed: string): () => number {
  let state = [...seed].reduce((acc, char) => acc * 31 + char.charCodeAt(0), 7) % 233280;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

function buildSeatRows(zone: ZoneTemplate): SeatRow[] {
  if (zone.seating !== "numbered" || !zone.rows) return [];

  const random = seededRandom(zone.id);
  const takenRatio = zone.status === "last-tickets" ? 0.8 : 0.3;
  const maxSeats = Math.max(...zone.rows.map(([, seats]) => seats));

  return zone.rows.map(([label, seatCount], rowIndex) => {
    // Las filas más cortas se centran respecto de la más larga.
    const offset = ((maxSeats - seatCount) * SEAT_SPACING) / 2;
    const seats: Seat[] = Array.from({ length: seatCount }, (_, index) => {
      const number = index + 1;
      return {
        id: `${zone.id}-${label}-${number}`,
        row: label,
        number,
        status: random() < takenRatio ? "taken" : "available",
        x: ROW_LABEL_GUTTER + offset + index * SEAT_SPACING + SEAT_SPACING / 2,
        y: rowIndex * ROW_SPACING + ROW_SPACING / 2,
      };
    });
    return { label, seats };
  });
}

export function getVenueLayout(
  id: VenueLayoutId,
  basePrice: number
): VenueLayout {
  const template = LAYOUTS[id];
  if (!template) {
    throw new Error(`Unknown venue layout: ${id}`);
  }

  const zones: VenueZone[] = template.zones.map((zone) => ({
    id: zone.id,
    name: zone.name,
    shortName: zone.shortName,
    price: Math.round(basePrice * zone.priceMultiplier),
    status: zone.status,
    seating: zone.seating,
    tone: zone.tone,
    shape: zone.shape,
    rows: buildSeatRows(zone),
  }));

  return {
    id,
    viewBox: template.viewBox,
    stage: template.stage,
    zones,
  };
}

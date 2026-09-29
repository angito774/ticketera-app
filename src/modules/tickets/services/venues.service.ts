import {
  boundsOf,
  labelPoint,
  pathOf,
  placeSeatsOnArc,
} from "@/modules/tickets/services/venue-geometry";
import type {
  Seat,
  SeatRow,
  ShapeGeometry,
  VenueLayout,
  VenueLayoutId,
  VenueZone,
  ZoneSeating,
  ZoneShape,
  ZoneStatus,
  ZoneTone,
} from "@/modules/tickets/types/venue.types";

export const MAX_TICKETS_PER_ZONE = 6;

/** Separación entre asientos (sobre el arco) y entre filas, en unidades del viewBox de `SeatMap`. */
export const SEAT_SPACING = 24;
export const ROW_SPACING = 28;
/** Radio de la primera fila: las filas son arcos concéntricos frente al escenario. */
export const FIRST_ROW_RADIUS = 260;

interface ZoneTemplate {
  id: string;
  name: string;
  shortName: string;
  /** La zona disponible más barata de cada layout usa 1, así su precio coincide con el "desde" del evento. */
  priceMultiplier: number;
  status: ZoneStatus;
  seating: ZoneSeating;
  tone: ZoneTone;
  geometry: ShapeGeometry;
  /** Solo zonas numeradas: etiqueta de fila → cantidad de asientos. */
  rows?: [label: string, seats: number][];
}

interface LayoutTemplate {
  viewBox: VenueLayout["viewBox"];
  stage: ShapeGeometry;
  zones: ZoneTemplate[];
}

const rowsOf = (labels: string, seats: number): [string, number][] =>
  labels.split("").map((label) => [label, seats]);

/** Estadio: campo frente al escenario y tribunas curvas en herradura alrededor del campo. */
const STADIUM_CENTER = { cx: 200, cy: 150 };
const STADIUM_RING = { innerRadius: 120, outerRadius: 185 };

/** Teatro: bandas concéntricas en abanico que se abren desde el escenario. */
const THEATER_FAN = { cx: 200, cy: 8, startAngle: 42, endAngle: 138 };

const LAYOUTS: Record<VenueLayoutId, LayoutTemplate> = {
  stadium: {
    viewBox: { width: 400, height: 345 },
    stage: { kind: "rect", rect: { x: 140, y: 36, width: 120, height: 32 }, radius: 10 },
    zones: [
      {
        id: "vip",
        name: "Campo VIP",
        shortName: "VIP",
        priceMultiplier: 2.76,
        status: "sold-out",
        seating: "general",
        tone: 1,
        geometry: { kind: "rect", rect: { x: 140, y: 80, width: 120, height: 56 }, radius: 14 },
      },
      {
        id: "general",
        name: "Campo General",
        shortName: "General",
        priceMultiplier: 1.8,
        status: "available",
        seating: "general",
        tone: 2,
        geometry: { kind: "rect", rect: { x: 120, y: 146, width: 160, height: 84 }, radius: 18 },
      },
      {
        id: "occidente",
        name: "Tribuna Occidente",
        shortName: "Occidente",
        priceMultiplier: 1.52,
        status: "last-tickets",
        seating: "numbered",
        tone: 3,
        geometry: { kind: "arc", ...STADIUM_CENTER, ...STADIUM_RING, startAngle: 130, endAngle: 220 },
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
        geometry: { kind: "arc", ...STADIUM_CENTER, ...STADIUM_RING, startAngle: -40, endAngle: 50 },
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
        geometry: { kind: "arc", ...STADIUM_CENTER, ...STADIUM_RING, startAngle: 58, endAngle: 122 },
      },
    ],
  },
  theater: {
    viewBox: { width: 400, height: 268 },
    stage: { kind: "rect", rect: { x: 120, y: 10, width: 160, height: 30 }, radius: 10 },
    zones: [
      {
        id: "preferencial",
        name: "Platea Preferencial",
        shortName: "Preferencial",
        priceMultiplier: 2,
        status: "last-tickets",
        seating: "numbered",
        tone: 1,
        geometry: { kind: "arc", ...THEATER_FAN, innerRadius: 62, outerRadius: 97 },
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
        geometry: { kind: "arc", ...THEATER_FAN, innerRadius: 104, outerRadius: 151 },
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
        geometry: { kind: "arc", ...THEATER_FAN, innerRadius: 158, outerRadius: 198 },
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
        geometry: { kind: "arc", ...THEATER_FAN, innerRadius: 205, outerRadius: 250 },
        rows: rowsOf("MNO", 22),
      },
    ],
  },
};

export function toZoneShape(geometry: ShapeGeometry): ZoneShape {
  return { geometry, path: pathOf(geometry), label: labelPoint(geometry), bounds: boundsOf(geometry) };
}

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

  return zone.rows.map(([label, seatCount], rowIndex) => {
    // Filas curvas: arcos concéntricos cuyo centro queda "detrás" del escenario (arriba).
    const radius = FIRST_ROW_RADIUS + rowIndex * ROW_SPACING;
    const withLabels = placeSeatsOnArc(0, 0, radius, seatCount + 2, SEAT_SPACING);
    const positions = withLabels.slice(1, -1);
    const seats: Seat[] = positions.map((position, index) => {
      const number = index + 1;
      return {
        id: `${zone.id}-${label}-${number}`,
        row: label,
        number,
        status: random() < takenRatio ? "taken" : "available",
        x: position.x,
        y: position.y,
        angle: position.angle,
      };
    });
    const first = withLabels[0];
    const last = withLabels[withLabels.length - 1];
    return { label, seats, labelPositions: [{ x: first.x, y: first.y }, { x: last.x, y: last.y }] };
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
    shape: toZoneShape(zone.geometry),
    rows: buildSeatRows(zone),
  }));

  return {
    id,
    viewBox: template.viewBox,
    stage: toZoneShape(template.stage),
    zones,
  };
}

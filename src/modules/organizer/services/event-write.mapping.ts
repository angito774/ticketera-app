import { sql, type SQL } from "drizzle-orm";

import {
  MIN_DESCRIPTION as MIN_DESCRIPTION_LENGTH,
  MIN_TITLE as MIN_TITLE_LENGTH,
  type EventSaveInput,
} from "@/modules/organizer/schemas/event-form.schema";

export class EventRuleError extends Error {}

const DIVISION_BY_ZERO = "22012";

/**
 * Primera sentencia del batch de edición: aborta todo (división por cero, 22012) si el evento ya no es borrador.
 * El divisor depende de una fila real: una constante `1/0` dentro de un CASE se evalúa al PLANIFICAR y fallaría siempre.
 */
export function draftGuardSql(eventId: string): SQL {
  return sql`select 1 / (select count(*)::int from events where id = ${eventId} and status = 'draft')`;
}

export function isDraftGuardFailure(error: unknown, depth = 0): boolean {
  if (depth > 5 || typeof error !== "object" || error === null) return false;
  const e = error as { code?: unknown; cause?: unknown };
  return e.code === DIVISION_BY_ZERO || isDraftGuardFailure(e.cause, depth + 1);
}

export interface ZoneInfo {
  id: string;
  name: string;
  seating: "general" | "numbered";
}

export interface TicketTypeRow {
  id: string;
  eventId: string;
  venueZoneId: string;
  name: string;
  price: number;
  quantityTotal: number | null;
}

export function nextSlug(base: string, taken: string[]): string {
  const root = base || "evento";
  const used = new Set(taken);
  if (!used.has(root)) return root;
  let n = 2;
  while (used.has(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
}

function isValidQuantity(quantity: number | null): quantity is number {
  return quantity !== null && Number.isInteger(quantity) && quantity >= 1;
}

function zoneById(zones: ZoneInfo[], zoneId: string): ZoneInfo {
  const zone = zones.find((z) => z.id === zoneId);
  if (!zone) throw new EventRuleError("Una de las zonas no pertenece al recinto");
  return zone;
}

export function buildTicketTypeRows(args: {
  mode: EventSaveInput["mode"];
  eventId: string;
  tiers: EventSaveInput["tiers"];
  zones: ZoneInfo[];
  newId: () => string;
}): TicketTypeRow[] {
  const seen = new Set<string>();
  return args.tiers.map((tier) => {
    if (seen.has(tier.zoneId)) throw new EventRuleError("Hay una zona repetida en las entradas");
    seen.add(tier.zoneId);
    const zone = zoneById(args.zones, tier.zoneId);
    if (!Number.isInteger(tier.priceCents) || tier.priceCents < 0) {
      throw new EventRuleError(`Precio inválido en la zona ${zone.name}`);
    }
    const quantityRequired = zone.seating === "general" && args.mode === "publish";
    const quantityGiven = zone.seating === "general" && tier.quantity !== null;
    if ((quantityRequired || quantityGiven) && !isValidQuantity(tier.quantity)) {
      throw new EventRuleError(`Indica una cantidad válida para la zona ${zone.name}`);
    }
    return {
      id: args.newId(),
      eventId: args.eventId,
      venueZoneId: zone.id,
      name: zone.name,
      price: tier.priceCents,
      quantityTotal: zone.seating === "general" ? tier.quantity : null,
    };
  });
}

export interface PersistableColumns {
  categoryId: string;
  venueId: string;
  startsAt: Date;
}

/** `events` exige categoría, recinto y fecha (NOT NULL), incluso en borrador. */
export function requireEventColumns(input: EventSaveInput): PersistableColumns {
  if (input.title.trim().length < MIN_TITLE_LENGTH) {
    throw new EventRuleError(`El nombre debe tener al menos ${MIN_TITLE_LENGTH} caracteres`);
  }
  if (!input.categoryId || !input.venueId || !input.startsAt) {
    throw new EventRuleError("Para guardar elige categoría, recinto y fecha del evento");
  }
  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) throw new EventRuleError("La fecha del evento no es válida");
  return { categoryId: input.categoryId, venueId: input.venueId, startsAt };
}

export function assertPublishable(
  input: EventSaveInput,
  zones: ZoneInfo[],
  now: Date = new Date(),
): void {
  if (input.title.trim().length < MIN_TITLE_LENGTH) {
    throw new EventRuleError(`El nombre debe tener al menos ${MIN_TITLE_LENGTH} caracteres`);
  }
  if (!input.categoryId) throw new EventRuleError("Elige una categoría para publicar");
  assertPublishedText(input);
  const startsAt = input.startsAt ? new Date(input.startsAt) : null;
  if (!startsAt || Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= now.getTime()) {
    throw new EventRuleError("La fecha del evento debe ser futura");
  }
  if (!input.venueId) throw new EventRuleError("Elige un recinto para publicar");
  if (input.tiers.length === 0) throw new EventRuleError("Agrega al menos una entrada para publicar");
  for (const tier of input.tiers) {
    const zone = zoneById(zones, tier.zoneId);
    if (!Number.isInteger(tier.priceCents) || tier.priceCents <= 0) {
      throw new EventRuleError(`El precio de la zona ${zone.name} debe ser mayor a 0`);
    }
    if (zone.seating === "general" && !isValidQuantity(tier.quantity)) {
      throw new EventRuleError(`Indica una cantidad válida para la zona ${zone.name}`);
    }
  }
}

/** Reglas de texto que un evento publicado debe seguir cumpliendo al editarse. */
export function assertPublishedText(input: Pick<EventSaveInput, "title" | "description">): void {
  if (input.title.trim().length < MIN_TITLE_LENGTH) {
    throw new EventRuleError(`El nombre debe tener al menos ${MIN_TITLE_LENGTH} caracteres`);
  }
  if ((input.description?.trim().length ?? 0) < MIN_DESCRIPTION_LENGTH) {
    throw new EventRuleError(
      `La descripción debe tener al menos ${MIN_DESCRIPTION_LENGTH} caracteres`,
    );
  }
}

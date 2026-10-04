import { randomBytes } from "node:crypto";

import { MAX_TICKETS_PER_ZONE } from "@/modules/tickets/services/venues.service";
import type { PurchaseSelection } from "@/modules/tickets/store/purchase.store";
import type { VenueLayout } from "@/modules/tickets/types/venue.types";

export class PurchaseRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PurchaseRuleError";
  }
}

export interface ResolvedZone {
  zoneKey: string;
  zoneName: string;
  seating: "general" | "numbered";
  quantity: number;
  seats: { seatId: string; row: string; number: number }[];
}

/** Valida la selección contra el layout y la devuelve en el orden de las zonas del layout. */
export function resolveSelection(
  layout: VenueLayout,
  selection: PurchaseSelection
): ResolvedZone[] {
  const known = new Set(layout.zones.map((zone) => zone.id));
  const requested = new Set([
    ...Object.entries(selection.quantities).filter(([, qty]) => qty !== 0).map(([id]) => id),
    ...Object.entries(selection.seats).filter(([, ids]) => ids.length > 0).map(([id]) => id),
  ]);
  for (const key of requested) {
    if (!known.has(key)) throw new PurchaseRuleError("La zona seleccionada no existe.");
  }

  const resolved: ResolvedZone[] = [];
  for (const zone of layout.zones) {
    if (!requested.has(zone.id)) continue;

    if (zone.seating === "general") {
      const quantity = selection.quantities[zone.id] ?? 0;
      if ((selection.seats[zone.id] ?? []).length > 0) {
        throw new PurchaseRuleError("Una zona general no admite asientos.");
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_TICKETS_PER_ZONE) {
        throw new PurchaseRuleError("Cantidad de entradas inválida.");
      }
      resolved.push({ zoneKey: zone.id, zoneName: zone.name, seating: "general", quantity, seats: [] });
      continue;
    }

    if ((selection.quantities[zone.id] ?? 0) !== 0) {
      throw new PurchaseRuleError("Una zona numerada requiere elegir asientos.");
    }
    const ids = selection.seats[zone.id] ?? [];
    if (new Set(ids).size !== ids.length) {
      throw new PurchaseRuleError("Hay asientos repetidos.");
    }
    if (ids.length > MAX_TICKETS_PER_ZONE) {
      throw new PurchaseRuleError("Cantidad de entradas inválida.");
    }
    const byId = new Map(
      zone.rows.flatMap((row) =>
        row.seats.map((seat) => [seat.id, { seatId: seat.id, row: row.label, number: seat.number }] as const)
      )
    );
    const seats = ids.map((id) => {
      const seat = byId.get(id);
      if (!seat) throw new PurchaseRuleError("El asiento seleccionado no existe.");
      return seat;
    });
    resolved.push({ zoneKey: zone.id, zoneName: zone.name, seating: "numbered", quantity: seats.length, seats });
  }

  if (resolved.length === 0) throw new PurchaseRuleError("Selecciona al menos una entrada.");
  return resolved;
}

export function computeTotalCents(
  items: { unitPriceCents: number; quantity: number }[]
): number {
  return items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
}

/** 18 bytes aleatorios: 24 caracteres base64url, no adivinables. */
export function generateQrToken(): string {
  return randomBytes(18).toString("base64url");
}

export function orderNumberFromId(orderId: string): string {
  return `TK-${orderId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

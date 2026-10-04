export interface TierInput {
  /** centavos */
  priceCents: number;
  quantity: number;
  sold: number;
}

export interface EventTotals {
  sold: number;
  capacity: number;
  /** soles */
  revenue: number;
  /** soles; menor precio > 0 */
  fromPrice: number | null;
}

export function centavosToSoles(cents: number): number {
  return cents / 100;
}

/** Los ingresos se acumulan en centavos enteros y se convierten una sola vez al final. */
export function computeEventTotals(tiers: TierInput[]): EventTotals {
  let sold = 0;
  let capacity = 0;
  let revenueCents = 0;
  let minCents: number | null = null;
  for (const tier of tiers) {
    sold += tier.sold;
    capacity += tier.quantity;
    revenueCents += tier.sold * tier.priceCents;
    if (tier.priceCents > 0 && (minCents === null || tier.priceCents < minCents)) {
      minCents = tier.priceCents;
    }
  }
  return {
    sold,
    capacity,
    revenue: centavosToSoles(revenueCents),
    fromPrice: minCents === null ? null : centavosToSoles(minCents),
  };
}

/** Zona numerada: `quantity_total` es null y la capacidad son sus asientos. */
export function mapTierCapacity(quantityTotal: number | null, seatCount: number): number {
  return quantityTotal ?? seatCount;
}

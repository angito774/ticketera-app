import type { Seat, VenueZone } from "@/modules/tickets/types/venue.types";

export type SeatNavigationKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Home" | "End";

const NAVIGATION_KEYS: readonly string[] = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];

export function isSeatNavigationKey(key: string): key is SeatNavigationKey {
  return NAVIGATION_KEYS.includes(key);
}

/** Las butacas ocupadas no reciben foco: no se pueden elegir ni navegar. */
export function focusableSeats(zone: VenueZone): Seat[] {
  return zone.rows.flatMap((row) => row.seats).filter((seat) => seat.status !== "taken");
}

/**
 * Siguiente butaca enfocable según la tecla. Izquierda/derecha/inicio/fin recorren la fila;
 * arriba/abajo buscan la butaca más cercana en esa dirección. Devuelve null si no hay destino.
 */
export function nextSeatId(zone: VenueZone, currentId: string, key: SeatNavigationKey): string | null {
  const seats = focusableSeats(zone);
  const current = seats.find((seat) => seat.id === currentId);
  if (!current) return null;

  const sameRow = seats.filter((seat) => seat.row === current.row).sort((a, b) => a.x - b.x);
  const index = sameRow.findIndex((seat) => seat.id === current.id);

  switch (key) {
    case "ArrowLeft":
      return sameRow[index - 1]?.id ?? null;
    case "ArrowRight":
      return sameRow[index + 1]?.id ?? null;
    case "Home":
      return sameRow[0]?.id ?? null;
    case "End":
      return sameRow.at(-1)?.id ?? null;
    case "ArrowUp":
    case "ArrowDown": {
      const above = key === "ArrowUp";
      const candidates = seats.filter((seat) => (above ? seat.y < current.y : seat.y > current.y));
      let best: Seat | null = null;
      let bestDistance = Infinity;
      for (const seat of candidates) {
        const distance = (seat.x - current.x) ** 2 + (seat.y - current.y) ** 2;
        if (distance < bestDistance) {
          best = seat;
          bestDistance = distance;
        }
      }
      return best?.id ?? null;
    }
  }
}

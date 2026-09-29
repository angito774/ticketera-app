import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { MAX_TICKETS_PER_ZONE } from "@/modules/tickets/services/venues.service";
import type {
  Seat,
  VenueLayout,
  VenueZone,
} from "@/modules/tickets/types/venue.types";

export interface PurchaseSelection {
  /** Zonas generales: cantidad de entradas por zona. */
  quantities: Record<string, number>;
  /** Zonas numeradas: ids de asiento seleccionados por zona. */
  seats: Record<string, string[]>;
}

interface PurchaseState extends PurchaseSelection {
  eventId: string | null;
  activeZoneId: string | null;
  /** Empieza la compra de un evento; si es otro evento, descarta la selección anterior. */
  startPurchase: (eventId: string) => void;
  selectZone: (zoneId: string) => void;
  setQuantity: (zone: VenueZone, quantity: number) => void;
  toggleSeat: (zone: VenueZone, seat: Seat) => void;
  clear: () => void;
}

const EMPTY_SELECTION: PurchaseSelection = { quantities: {}, seats: {} };

export const usePurchaseStore = create<PurchaseState>()(
  persist(
    (set, get) => ({
      eventId: null,
      activeZoneId: null,
      ...EMPTY_SELECTION,

      startPurchase: (eventId) => {
        if (get().eventId === eventId) return;
        set({ eventId, activeZoneId: null, ...EMPTY_SELECTION });
      },

      selectZone: (zoneId) => set({ activeZoneId: zoneId }),

      setQuantity: (zone, quantity) => {
        if (zone.seating !== "general" || zone.status === "sold-out") return;
        const clamped = Math.min(Math.max(Math.trunc(quantity), 0), MAX_TICKETS_PER_ZONE);
        set((state) => ({
          activeZoneId: zone.id,
          quantities: { ...state.quantities, [zone.id]: clamped },
        }));
      },

      toggleSeat: (zone, seat) => {
        if (zone.seating !== "numbered" || seat.status === "taken") return;
        if (!zone.rows.some((row) => row.seats.some((item) => item.id === seat.id))) return;

        const current = get().seats[zone.id] ?? [];
        const isSelected = current.includes(seat.id);
        if (!isSelected && current.length >= MAX_TICKETS_PER_ZONE) return;

        set((state) => ({
          activeZoneId: zone.id,
          seats: {
            ...state.seats,
            [zone.id]: isSelected
              ? current.filter((id) => id !== seat.id)
              : [...current, seat.id],
          },
        }));
      },

      clear: () => set({ activeZoneId: null, ...EMPTY_SELECTION }),
    }),
    {
      // sessionStorage: la selección sobrevive a recargas del checkout, no a cerrar la pestaña.
      name: "ticketera-purchase",
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ eventId, quantities, seats }) => ({ eventId, quantities, seats }),
    }
  )
);

export interface PurchaseLine {
  zoneId: string;
  zoneName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  /** Solo zonas numeradas, agrupados por fila: ["Fila B: 7, 8"]. */
  seatLabels: string[];
}

export interface PurchaseSummary {
  lines: PurchaseLine[];
  ticketCount: number;
  total: number;
}

function formatSeatLabels(zone: VenueZone, seatIds: string[]): string[] {
  return zone.rows
    .map((row) => {
      const numbers = row.seats
        .filter((seat) => seatIds.includes(seat.id))
        .map((seat) => seat.number);
      return numbers.length ? `Fila ${row.label}: ${numbers.join(", ")}` : null;
    })
    .filter((label): label is string => label !== null);
}

/** Líneas y totales de la compra en el orden de las zonas del layout. */
export function buildPurchaseSummary(
  layout: VenueLayout,
  selection: PurchaseSelection
): PurchaseSummary {
  const lines = layout.zones
    .map((zone): PurchaseLine => {
      const seatIds = selection.seats[zone.id] ?? [];
      const quantity =
        zone.seating === "numbered"
          ? seatIds.length
          : (selection.quantities[zone.id] ?? 0);
      return {
        zoneId: zone.id,
        zoneName: zone.name,
        quantity,
        unitPrice: zone.price,
        amount: quantity * zone.price,
        seatLabels:
          zone.seating === "numbered" ? formatSeatLabels(zone, seatIds) : [],
      };
    })
    .filter((line) => line.quantity > 0);

  return {
    lines,
    ticketCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    total: lines.reduce((sum, line) => sum + line.amount, 0),
  };
}

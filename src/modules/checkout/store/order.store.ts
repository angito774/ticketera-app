import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Order } from "@/modules/checkout/types/order.types";

export const RESERVATION_MINUTES = 10;

interface OrderState {
  /** Último pedido confirmado (el que muestra la confirmación). */
  order: Order | null;
  /** eventId → vencimiento ISO de la reserva de entradas. */
  reservationExpiresAt: Record<string, string>;
  /** Crea la reserva si no existe o si ya venció; devuelve su vencimiento. */
  startReservation: (eventId: string, now?: Date) => string;
  resetReservation: (eventId: string) => void;
  /** Guarda el pedido y libera la reserva de su evento. */
  completeOrder: (order: Order) => void;
}

function withoutKey(record: Record<string, string>, key: string): Record<string, string> {
  return Object.fromEntries(Object.entries(record).filter(([entryKey]) => entryKey !== key));
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      order: null,
      reservationExpiresAt: {},

      startReservation: (eventId, now = new Date()) => {
        const current = get().reservationExpiresAt[eventId];
        if (current && new Date(current) > now) return current;

        const expiresAt = new Date(now.getTime() + RESERVATION_MINUTES * 60_000).toISOString();
        set((state) => ({
          reservationExpiresAt: { ...state.reservationExpiresAt, [eventId]: expiresAt },
        }));
        return expiresAt;
      },

      resetReservation: (eventId) =>
        set((state) => ({ reservationExpiresAt: withoutKey(state.reservationExpiresAt, eventId) })),

      completeOrder: (order) =>
        set((state) => ({
          order,
          reservationExpiresAt: withoutKey(state.reservationExpiresAt, order.eventId),
        })),
    }),
    {
      name: "ticketera-order",
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ order, reservationExpiresAt }) => ({ order, reservationExpiresAt }),
    }
  )
);

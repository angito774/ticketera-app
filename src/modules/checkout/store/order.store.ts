import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Order } from "@/modules/checkout/types/order.types";

export const RESERVATION_MINUTES = 10;

interface OrderState {
  /** Historial de pedidos confirmados en este navegador, más reciente primero. */
  orders: Order[];
  /** Número del último pedido confirmado (el que muestra la confirmación). */
  lastOrderNumber: string | null;
  /** eventId → vencimiento ISO de la reserva de entradas. */
  reservationExpiresAt: Record<string, string>;
  /** Crea la reserva si no existe o si ya venció; devuelve su vencimiento. */
  startReservation: (eventId: string, now?: Date) => string;
  resetReservation: (eventId: string) => void;
  /** Agrega el pedido al historial, lo marca como el último y libera la reserva de su evento. */
  completeOrder: (order: Order) => void;
}

function withoutKey(record: Record<string, string>, key: string): Record<string, string> {
  return Object.fromEntries(Object.entries(record).filter(([entryKey]) => entryKey !== key));
}

/** Último pedido confirmado, o null. */
export function selectLastOrder(state: Pick<OrderState, "orders" | "lastOrderNumber">): Order | null {
  return state.orders.find((order) => order.number === state.lastOrderNumber) ?? null;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: [],
      lastOrderNumber: null,
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
          orders: [order, ...state.orders.filter((item) => item.number !== order.number)],
          lastOrderNumber: order.number,
          reservationExpiresAt: withoutKey(state.reservationExpiresAt, order.eventId),
        })),
    }),
    {
      // localStorage: "Mis entradas" debe ver los pedidos desde cualquier pestaña.
      name: "ticketera-orders",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ orders, lastOrderNumber, reservationExpiresAt }) => ({
        orders,
        lastOrderNumber,
        reservationExpiresAt,
      }),
    }
  )
);

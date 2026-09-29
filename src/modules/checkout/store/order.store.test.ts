import { beforeEach, describe, expect, it } from "vitest";

import { RESERVATION_MINUTES, useOrderStore } from "@/modules/checkout/store/order.store";
import type { Order } from "@/modules/checkout/types/order.types";

const NOW = new Date("2026-09-29T17:00:00Z");
const minutesLater = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);
const store = () => useOrderStore.getState();

const ORDER: Order = {
  number: "TK-24817",
  eventId: "concert-01",
  buyerName: "Ana Quispe",
  buyerEmail: "ana@correo.pe",
  paymentMethod: "yape",
  lines: [],
  ticketCount: 2,
  total: 900,
  tickets: [],
  createdAt: NOW.toISOString(),
};

beforeEach(() => {
  sessionStorage.clear();
  useOrderStore.setState({ order: null, reservationExpiresAt: {} });
});

describe("order.store", () => {
  it(`starts a ${RESERVATION_MINUTES}-minute reservation`, () => {
    expect(store().startReservation("concert-01", NOW)).toBe(
      minutesLater(RESERVATION_MINUTES).toISOString()
    );
  });

  it("keeps an active reservation instead of extending it", () => {
    const first = store().startReservation("concert-01", NOW);
    expect(store().startReservation("concert-01", minutesLater(4))).toBe(first);
  });

  it("renews an expired reservation", () => {
    store().startReservation("concert-01", NOW);
    const later = minutesLater(RESERVATION_MINUTES + 1);
    expect(store().startReservation("concert-01", later)).toBe(
      new Date(later.getTime() + RESERVATION_MINUTES * 60_000).toISOString()
    );
  });

  it("resetReservation only removes the given event", () => {
    store().startReservation("concert-01", NOW);
    store().startReservation("theater-01", NOW);
    store().resetReservation("concert-01");
    expect(Object.keys(store().reservationExpiresAt)).toEqual(["theater-01"]);
  });

  it("completeOrder saves the order and releases its reservation", () => {
    store().startReservation("concert-01", NOW);
    store().completeOrder(ORDER);
    expect(store().order).toEqual(ORDER);
    expect(store().reservationExpiresAt).toEqual({});
  });

  it("persists the order in sessionStorage", () => {
    store().completeOrder(ORDER);
    const saved = JSON.parse(sessionStorage.getItem("ticketera-order") ?? "{}");
    expect(saved.state.order.number).toBe("TK-24817");
  });
});

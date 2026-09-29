import { describe, expect, it } from "vitest";

import {
  DEMO_ORDERS,
  getOrdersForUser,
  splitOrdersByDate,
} from "@/modules/account/services/my-tickets.service";
import type { Order } from "@/modules/checkout/types/order.types";

const stored = (patch: Partial<Order>): Order => ({ ...DEMO_ORDERS[0], number: "TK-50000", buyerEmail: "luz@correo.pe", ...patch });

describe("DEMO_ORDERS", () => {
  it("has two sample orders with their tickets", () => {
    expect(DEMO_ORDERS.map((order) => [order.number, order.eventId, order.ticketCount])).toEqual([
      ["TK-24817", "concert-01", 2],
      ["TK-24790", "theater-01", 1],
    ]);
    expect(DEMO_ORDERS[1].tickets[0].seatLabel).toMatch(/^Fila [A-Z] · Asiento \d+$/);
  });
});

describe("getOrdersForUser", () => {
  it("returns the stored orders of that email, ignoring case", () => {
    const orders = [stored({}), stored({ number: "TK-50001", buyerEmail: "otro@correo.pe" })];
    expect(getOrdersForUser("LUZ@correo.pe", orders).map((order) => order.number)).toEqual(["TK-50000"]);
  });

  it("adds the sample orders for the demo account, without duplicates, sorted by event date", () => {
    const own = stored({ number: "TK-50002", buyerEmail: "demo@ticketera.pe", eventId: "theater-02" });
    const result = getOrdersForUser("demo@ticketera.pe", [own, DEMO_ORDERS[0]]);
    // theater-02 (24 oct) → theater-01 (7 nov) → concert-01 (14 nov)
    expect(result.map((order) => order.number)).toEqual(["TK-50002", "TK-24790", "TK-24817"]);
  });

  it("returns nothing for an email without orders", () => {
    expect(getOrdersForUser("nadie@correo.pe", [stored({})])).toEqual([]);
  });
});

describe("splitOrdersByDate", () => {
  it("splits by event date against now", () => {
    const { upcoming, past } = splitOrdersByDate(DEMO_ORDERS, new Date("2026-11-10T12:00:00-05:00"));
    expect(upcoming.map((order) => order.eventId)).toEqual(["concert-01"]);
    expect(past.map((order) => order.eventId)).toEqual(["theater-01"]);
  });
});

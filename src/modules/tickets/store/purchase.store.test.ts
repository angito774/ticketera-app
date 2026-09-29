import { beforeEach, describe, expect, it } from "vitest";

import {
  getVenueLayout,
  MAX_TICKETS_PER_ZONE,
} from "@/modules/tickets/services/venues.service";
import {
  buildPurchaseSummary,
  usePurchaseStore,
} from "@/modules/tickets/store/purchase.store";
import type { VenueZone } from "@/modules/tickets/types/venue.types";

const layout = getVenueLayout("stadium", 250);
const zone = (id: string) => layout.zones.find((item) => item.id === id)!;
const availableSeats = (target: VenueZone) =>
  target.rows.flatMap((row) => row.seats).filter((seat) => seat.status === "available");
const takenSeat = (target: VenueZone) =>
  target.rows.flatMap((row) => row.seats).find((seat) => seat.status === "taken")!;

const store = () => usePurchaseStore.getState();

beforeEach(() => {
  usePurchaseStore.setState({
    eventId: null,
    activeZoneId: null,
    quantities: {},
    seats: {},
  });
  store().startPurchase("concert-01");
});

describe("purchase.store", () => {
  describe("setQuantity", () => {
    it("sets the quantity of a general zone and makes it active", () => {
      store().setQuantity(zone("general"), 2);
      expect(store().quantities.general).toBe(2);
      expect(store().activeZoneId).toBe("general");
    });

    it(`clamps between 0 and ${MAX_TICKETS_PER_ZONE}`, () => {
      store().setQuantity(zone("general"), 99);
      expect(store().quantities.general).toBe(MAX_TICKETS_PER_ZONE);
      store().setQuantity(zone("general"), -3);
      expect(store().quantities.general).toBe(0);
    });

    it("ignores sold-out and numbered zones", () => {
      store().setQuantity(zone("vip"), 2);
      store().setQuantity(zone("oriente"), 2);
      expect(store().quantities).toEqual({});
    });
  });

  describe("toggleSeat", () => {
    const oriente = zone("oriente");

    it("adds and removes an available seat", () => {
      const [seat] = availableSeats(oriente);
      store().toggleSeat(oriente, seat);
      expect(store().seats.oriente).toEqual([seat.id]);
      store().toggleSeat(oriente, seat);
      expect(store().seats.oriente).toEqual([]);
    });

    it("ignores taken seats", () => {
      store().toggleSeat(oriente, takenSeat(oriente));
      expect(store().seats.oriente).toBeUndefined();
    });

    it("ignores seats that belong to another zone", () => {
      const [foreignSeat] = availableSeats(zone("occidente"));
      store().toggleSeat(oriente, foreignSeat);
      expect(store().seats.oriente).toBeUndefined();
    });

    it(`does not allow more than ${MAX_TICKETS_PER_ZONE} seats per zone`, () => {
      const seats = availableSeats(oriente).slice(0, MAX_TICKETS_PER_ZONE + 1);
      seats.forEach((seat) => store().toggleSeat(oriente, seat));
      expect(store().seats.oriente).toHaveLength(MAX_TICKETS_PER_ZONE);
      expect(store().seats.oriente).not.toContain(seats[MAX_TICKETS_PER_ZONE].id);
    });
  });

  describe("startPurchase", () => {
    it("keeps the selection when resuming the same event", () => {
      store().setQuantity(zone("general"), 2);
      store().startPurchase("concert-01");
      expect(store().quantities.general).toBe(2);
    });

    it("resets the selection when switching events", () => {
      store().setQuantity(zone("general"), 2);
      store().startPurchase("theater-01");
      expect(store()).toMatchObject({
        eventId: "theater-01",
        activeZoneId: null,
        quantities: {},
        seats: {},
      });
    });
  });

  it("clear empties the selection", () => {
    store().setQuantity(zone("general"), 2);
    store().clear();
    expect(store().quantities).toEqual({});
    expect(store().activeZoneId).toBeNull();
  });
});

describe("buildPurchaseSummary", () => {
  it("returns an empty summary without selection", () => {
    expect(buildPurchaseSummary(layout, { quantities: {}, seats: {} })).toEqual({
      lines: [],
      ticketCount: 0,
      total: 0,
    });
  });

  it("combines general and numbered zones in layout order", () => {
    const oriente = zone("oriente");
    const seats = oriente.rows[1].seats
      .filter((seat) => seat.status === "available")
      .slice(0, 2);

    const summary = buildPurchaseSummary(layout, {
      quantities: { norte: 3, general: 0 },
      seats: { oriente: seats.map((seat) => seat.id) },
    });

    expect(summary.lines).toEqual([
      {
        zoneId: "oriente",
        zoneName: "Tribuna Oriente",
        quantity: 2,
        unitPrice: 320,
        amount: 640,
        seatLabels: [`Fila B: ${seats.map((seat) => seat.number).join(", ")}`],
      },
      {
        zoneId: "norte",
        zoneName: "Tribuna Norte",
        quantity: 3,
        unitPrice: 250,
        amount: 750,
        seatLabels: [],
      },
    ]);
    expect(summary.ticketCount).toBe(5);
    expect(summary.total).toBe(1390);
  });
});

import { describe, expect, it } from "vitest";
import { getAllEvents, getEventById } from "@/modules/events/services/events.service";
import { getVenueLayout } from "@/modules/tickets/services/venues.service";
import type { VenueLayoutId } from "@/modules/tickets/types/venue.types";

const LAYOUT_IDS: VenueLayoutId[] = ["stadium", "theater"];

describe("venues.service", () => {
  it.each(LAYOUT_IDS)("is deterministic for the %s layout", (id) => {
    expect(getVenueLayout(id, 250)).toEqual(getVenueLayout(id, 250));
  });

  it.each(LAYOUT_IDS)(
    "prices the cheapest available %s zone at the base price",
    (id) => {
      const { zones } = getVenueLayout(id, 250);
      const available = zones.filter((zone) => zone.status !== "sold-out");
      expect(Math.min(...available.map((zone) => zone.price))).toBe(250);
    }
  );

  it("derives zone prices from the base price", () => {
    const zones = getVenueLayout("stadium", 250).zones;
    expect(zones.map((zone) => [zone.id, zone.price])).toEqual([
      ["vip", 690],
      ["general", 450],
      ["occidente", 380],
      ["oriente", 320],
      ["norte", 250],
    ]);
  });

  it("only numbered zones have seats, with unique ids", () => {
    for (const id of LAYOUT_IDS) {
      for (const zone of getVenueLayout(id, 100).zones) {
        const seats = zone.rows.flatMap((row) => row.seats);
        if (zone.seating === "general") {
          expect(seats).toHaveLength(0);
        } else {
          expect(seats.length).toBeGreaterThan(0);
          expect(new Set(seats.map((seat) => seat.id)).size).toBe(seats.length);
        }
      }
    }
  });

  it("marks some seats as taken but leaves seats available", () => {
    const seats = getVenueLayout("theater", 100).zones.flatMap((zone) =>
      zone.rows.flatMap((row) => row.seats)
    );
    expect(seats.some((seat) => seat.status === "taken")).toBe(true);
    expect(seats.some((seat) => seat.status === "available")).toBe(true);
  });

  it("throws for an unknown layout", () => {
    expect(() => getVenueLayout("arena" as VenueLayoutId, 100)).toThrow();
  });

  it("matches the 'desde' price of every mock event", () => {
    for (const { id } of getAllEvents()) {
      const event = getEventById(id)!;
      const { zones } = getVenueLayout(event.layoutId, event.price);
      const available = zones.filter((zone) => zone.status !== "sold-out");
      expect(Math.min(...available.map((zone) => zone.price))).toBe(event.price);
    }
  });
});

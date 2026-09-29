import { describe, expect, it } from "vitest";
import { getAllEvents, getEventById } from "@/modules/events/services/events.service";
import { shapesOverlap } from "@/modules/tickets/services/venue-geometry";
import { SEAT_SPACING, getVenueLayout } from "@/modules/tickets/services/venues.service";
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

  it.each(LAYOUT_IDS)("draws %s zones that do not overlap each other or the stage", (id) => {
    const { zones, stage } = getVenueLayout(id, 100);
    const shapes = [stage.geometry, ...zones.map((zone) => zone.shape.geometry)];
    for (let i = 0; i < shapes.length; i++) {
      for (let j = i + 1; j < shapes.length; j++) {
        expect(shapesOverlap(shapes[i], shapes[j]), `${i} vs ${j}`).toBe(false);
      }
    }
  });

  it.each(LAYOUT_IDS)("keeps every %s zone inside the viewBox", (id) => {
    const { zones, viewBox } = getVenueLayout(id, 100);
    for (const zone of zones) {
      const { x, y, width, height } = zone.shape.bounds;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + width).toBeLessThanOrEqual(viewBox.width);
      expect(y + height).toBeLessThanOrEqual(viewBox.height);
    }
  });

  it("uses curved tribunes in the stadium and a fan of bands in the theater", () => {
    const kinds = (id: VenueLayoutId) =>
      Object.fromEntries(getVenueLayout(id, 100).zones.map((zone) => [zone.id, zone.shape.geometry.kind]));
    expect(kinds("stadium")).toEqual({ vip: "rect", general: "rect", occidente: "arc", oriente: "arc", norte: "arc" });
    expect(Object.values(kinds("theater")).every((kind) => kind === "arc")).toBe(true);
  });

  it("places seats on curved rows without overlapping", () => {
    for (const zone of getVenueLayout("theater", 100).zones) {
      for (const row of zone.rows) {
        const ys = row.seats.map((seat) => seat.y);
        expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(1);
        for (let i = 1; i < row.seats.length; i++) {
          const [a, b] = [row.seats[i - 1], row.seats[i]];
          expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThanOrEqual(SEAT_SPACING - 0.5);
        }
        expect(row.labelPositions[0].x).toBeLessThan(row.seats[0].x);
        expect(row.labelPositions[1].x).toBeGreaterThan(row.seats[row.seats.length - 1].x);
      }
    }
  });
});

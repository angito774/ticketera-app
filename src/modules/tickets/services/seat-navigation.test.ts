import { describe, expect, it } from "vitest";

import { focusableSeats, isSeatNavigationKey, nextSeatId } from "@/modules/tickets/services/seat-navigation";
import type { Seat, VenueZone } from "@/modules/tickets/types/venue.types";

const seat = (id: string, row: string, x: number, y: number, status: Seat["status"] = "available"): Seat => ({
  id,
  row,
  number: Number(id.slice(-1)),
  status,
  x,
  y,
  angle: 0,
});

// Fila A (adelante, y=0) y fila B (atrás, y=10). A2 está ocupada.
const zone = {
  rows: [
    {
      label: "A",
      seats: [seat("a1", "A", 0, 0), seat("a2", "A", 10, 0, "taken"), seat("a3", "A", 20, 0)],
      labelPositions: [],
    },
    {
      label: "B",
      seats: [seat("b1", "B", 2, 10), seat("b2", "B", 12, 10), seat("b3", "B", 22, 10)],
      labelPositions: [],
    },
  ],
} as unknown as VenueZone;

describe("focusableSeats", () => {
  it("excludes taken seats", () => {
    expect(focusableSeats(zone).map((s) => s.id)).toEqual(["a1", "a3", "b1", "b2", "b3"]);
  });
});

describe("nextSeatId", () => {
  it("moves left and right within the row, skipping taken seats", () => {
    expect(nextSeatId(zone, "a1", "ArrowRight")).toBe("a3");
    expect(nextSeatId(zone, "a3", "ArrowLeft")).toBe("a1");
  });

  it("returns null at the edges of the row", () => {
    expect(nextSeatId(zone, "a1", "ArrowLeft")).toBeNull();
    expect(nextSeatId(zone, "a3", "ArrowRight")).toBeNull();
  });

  it("jumps to the first and last seat of the row with Home and End", () => {
    expect(nextSeatId(zone, "b2", "Home")).toBe("b1");
    expect(nextSeatId(zone, "b2", "End")).toBe("b3");
  });

  it("moves up and down to the closest seat in that direction", () => {
    expect(nextSeatId(zone, "a3", "ArrowDown")).toBe("b3");
    expect(nextSeatId(zone, "a1", "ArrowDown")).toBe("b1");
    expect(nextSeatId(zone, "b2", "ArrowUp")).toBe("a3");
    expect(nextSeatId(zone, "a1", "ArrowUp")).toBeNull();
  });

  it("returns null for an unknown or taken seat", () => {
    expect(nextSeatId(zone, "missing", "ArrowRight")).toBeNull();
    expect(nextSeatId(zone, "a2", "ArrowRight")).toBeNull();
  });
});

describe("isSeatNavigationKey", () => {
  it("recognises only the navigation keys", () => {
    expect(isSeatNavigationKey("ArrowUp")).toBe(true);
    expect(isSeatNavigationKey("Enter")).toBe(false);
  });
});

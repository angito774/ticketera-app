import { describe, expect, it } from "vitest";

import {
  applyAvailability,
  findUnavailableSelection,
  getZoneMaxTickets,
} from "@/modules/tickets/services/availability-overlay";
import { getVenueLayout } from "@/modules/tickets/services/venues.service";

const layout = getVenueLayout("stadium", 100);
const seats = layout.zones.find((z) => z.id === "occidente")!.rows.flatMap((r) => r.seats);
const [target, bystander] = seats.filter((s) => s.status === "available");
const seatId = target.id;

describe("applyAvailability", () => {
  it("marks sold seats as taken without mutating the original", () => {
    const result = applyAvailability(layout, { soldSeatIds: [seatId], remainingByZone: {} });
    const after = result.zones.find((z) => z.id === "occidente")!.rows.flatMap((r) => r.seats);
    expect(after.find((s) => s.id === seatId)!.status).toBe("taken");
    expect(after.find((s) => s.id === bystander.id)!.status).toBe("available");
    expect(seats.find((s) => s.id === seatId)!.status).toBe("available");
  });

  it("marks a general zone sold out when nothing remains", () => {
    const result = applyAvailability(layout, { soldSeatIds: [], remainingByZone: { general: 0 } });
    expect(result.zones.find((z) => z.id === "general")!.status).toBe("sold-out");
  });

  it("flags last tickets when few remain", () => {
    const result = applyAvailability(layout, { soldSeatIds: [], remainingByZone: { general: 3 } });
    expect(result.zones.find((z) => z.id === "general")!.status).toBe("last-tickets");
  });
});

describe("getZoneMaxTickets", () => {
  it("caps by remaining and by the per-zone limit", () => {
    const availability = { soldSeatIds: [], remainingByZone: { general: 2, vip: 500, occidente: null } };
    expect(getZoneMaxTickets(availability, "general")).toBe(2);
    expect(getZoneMaxTickets(availability, "vip")).toBe(6);
    expect(getZoneMaxTickets(null, "general")).toBe(6);
  });
});

describe("findUnavailableSelection", () => {
  it("reports sold seats and zones over their remaining quota", () => {
    const result = findUnavailableSelection(
      { quantities: { general: 4, vip: 1 }, seats: { occidente: [seatId, "other"] } },
      { soldSeatIds: [seatId], remainingByZone: { general: 2, vip: 10 } }
    );
    expect(result).toEqual({ seats: { occidente: [seatId] }, zones: ["general"] });
  });

  it("reports nothing when all is available", () => {
    const result = findUnavailableSelection(
      { quantities: { general: 1 }, seats: { occidente: [seatId] } },
      { soldSeatIds: [], remainingByZone: { general: 5 } }
    );
    expect(result).toEqual({ seats: {}, zones: [] });
  });
});

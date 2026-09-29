import { describe, expect, it } from "vitest";

import {
  ORGANIZER_EVENTS,
  filterOrganizerEvents,
  getEventTotals,
  getOrganizerSummary,
  mergeOrganizerEvents,
} from "@/modules/organizer/services/organizer.service";
import type { OrganizerEvent } from "@/modules/organizer/types/organizer.types";

const event = (patch: Partial<OrganizerEvent>): OrganizerEvent => ({
  id: "org-1",
  catalogEventId: null,
  status: "draft",
  title: "Evento",
  category: "concert",
  description: "",
  startsAt: null,
  venue: "",
  city: "",
  imageUrl: null,
  tiers: [],
  ...patch,
});

describe("ORGANIZER_EVENTS", () => {
  it("has 4 published catalog events and 1 draft", () => {
    expect(ORGANIZER_EVENTS.filter((item) => item.status === "published")).toHaveLength(4);
    expect(ORGANIZER_EVENTS.filter((item) => item.status === "draft")).toHaveLength(1);
    expect(ORGANIZER_EVENTS.every((item) => item.status === "draft" || item.catalogEventId === item.id)).toBe(true);
  });

  it("never sells more tickets than available", () => {
    ORGANIZER_EVENTS.flatMap((item) => item.tiers).forEach((tier) => {
      expect(tier.sold).toBeLessThanOrEqual(tier.quantity);
    });
  });
});

describe("getEventTotals", () => {
  it("sums sold, capacity and revenue per tier and finds the lowest price", () => {
    expect(
      getEventTotals(
        event({
          tiers: [
            { name: "VIP", price: 200, quantity: 100, sold: 10 },
            { name: "General", price: 80, quantity: 400, sold: 150 },
            { name: "Cortesía", price: 0, quantity: 20, sold: 5 },
          ],
        })
      )
    ).toEqual({ sold: 165, capacity: 520, revenue: 14000, fromPrice: 80 });
  });

  it("has no price without tiers", () => {
    expect(getEventTotals(event({})).fromPrice).toBeNull();
  });
});

describe("getOrganizerSummary", () => {
  it("adds up every event and counts only published ones", () => {
    const summary = getOrganizerSummary([
      event({ status: "published", tiers: [{ name: "A", price: 100, quantity: 10, sold: 3 }] }),
      event({ status: "draft", tiers: [{ name: "B", price: 50, quantity: 10, sold: 0 }] }),
    ]);
    expect(summary).toEqual({ sold: 3, revenue: 300, published: 1 });
  });

  it("matches the mock data", () => {
    const summary = getOrganizerSummary(ORGANIZER_EVENTS);
    expect(summary.published).toBe(4);
    expect(summary.sold).toBe(548 + 352 + 214 + 96 + 287 + 25 + 414);
  });
});

describe("filterOrganizerEvents", () => {
  it("filters by status", () => {
    expect(filterOrganizerEvents(ORGANIZER_EVENTS, "all")).toHaveLength(5);
    expect(filterOrganizerEvents(ORGANIZER_EVENTS, "draft").map((item) => item.id)).toEqual(["draft-feria-verano"]);
  });
});

describe("mergeOrganizerEvents", () => {
  it("replaces mock events by id, adds new ones and sorts by date with undated last", () => {
    const mock = [
      event({ id: "a", startsAt: "2026-12-01T20:00:00-05:00" }),
      event({ id: "b", startsAt: "2026-10-01T20:00:00-05:00" }),
    ];
    const saved = [
      event({ id: "a", title: "Editado", startsAt: "2026-12-01T20:00:00-05:00" }),
      event({ id: "c", startsAt: null }),
      event({ id: "d", startsAt: "2026-11-01T20:00:00-05:00" }),
    ];
    const merged = mergeOrganizerEvents(mock, saved);
    expect(merged.map((item) => item.id)).toEqual(["b", "d", "a", "c"]);
    expect(merged.find((item) => item.id === "a")?.title).toBe("Editado");
  });
});

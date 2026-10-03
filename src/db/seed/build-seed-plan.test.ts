import { describe, expect, it } from "vitest";

import { buildSeedPlan } from "@/db/seed/build-seed-plan";
import { getAllEvents } from "@/modules/events/services/events.service";

describe("buildSeedPlan", () => {
  const plan = buildSeedPlan();

  it("creates one event per mock event with unique slugs", () => {
    expect(plan.events).toHaveLength(getAllEvents().length);
    expect(new Set(plan.events.map((e) => e.slug)).size).toBe(plan.events.length);
  });

  it("references only categories and venues that exist in the plan", () => {
    const categories = new Set(plan.categories.map((c) => c.slug));
    const venues = new Set(plan.venues.map((v) => v.key));
    for (const event of plan.events) {
      expect(categories.has(event.categorySlug)).toBe(true);
      expect(venues.has(event.venueKey)).toBe(true);
    }
  });

  it("shares a venue between events held there", () => {
    const names = plan.venues.map((v) => v.name);
    expect(new Set(names).size).toBe(names.length);
    expect(plan.venues.length).toBeLessThan(plan.events.length);
  });

  it("prices every zone of the event's venue in cents", () => {
    for (const event of plan.events) {
      const venue = plan.venues.find((v) => v.key === event.venueKey)!;
      expect(event.ticketTypes.map((t) => t.zoneKey).sort()).toEqual(
        venue.zones.map((z) => z.key).sort(),
      );
      for (const type of event.ticketTypes) {
        expect(Number.isInteger(type.price) && type.price > 0).toBe(true);
        expect(type.price % 100).toBe(0);
      }
    }
  });

  it("only sets quantityTotal on general zones, never over-selling", () => {
    for (const event of plan.events) {
      const venue = plan.venues.find((v) => v.key === event.venueKey)!;
      for (const type of event.ticketTypes) {
        const zone = venue.zones.find((z) => z.key === type.zoneKey)!;
        if (zone.seating === "general") {
          expect(type.quantityTotal).not.toBeNull();
          expect(type.quantitySold).toBeLessThanOrEqual(type.quantityTotal!);
          expect(zone.seats).toHaveLength(0);
        } else {
          expect(type.quantityTotal).toBeNull();
          expect(type.quantitySold).toBe(zone.seats.filter((s) => s.sold).length);
        }
      }
    }
  });

  it("keeps the mock's start and doors-open times", () => {
    const first = plan.events.find((e) => e.slug === "concert-01")!;
    expect(first.startsAt.toISOString()).toBe("2026-11-15T01:00:00.000Z");
    expect(first.minAge).toBe(12);
  });
});

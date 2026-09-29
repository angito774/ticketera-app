import { describe, expect, it } from "vitest";
import {
  getAllEvents,
  getEventsByCategory,
  getFeaturedEvents,
} from "@/modules/events/services/events.service";

describe("events.service", () => {
  it("getAllEvents returns all 10 mock events", () => {
    expect(getAllEvents()).toHaveLength(10);
  });

  it("getFeaturedEvents only returns events with featured: true", () => {
    const featured = getFeaturedEvents();
    expect(featured.length).toBeGreaterThanOrEqual(3);
    expect(featured.every((event) => event.featured === true)).toBe(true);
  });

  it("getEventsByCategory('concert') only returns concert events", () => {
    const concerts = getEventsByCategory("concert");
    expect(concerts).toHaveLength(6);
    expect(concerts.every((event) => event.category === "concert")).toBe(true);
  });

  it("getEventsByCategory('theater') only returns theater events", () => {
    const theater = getEventsByCategory("theater");
    expect(theater).toHaveLength(4);
    expect(theater.every((event) => event.category === "theater")).toBe(true);
  });

  it("does not mix categories between concert and theater results", () => {
    const concerts = getEventsByCategory("concert");
    const theater = getEventsByCategory("theater");
    const overlap = concerts.filter((event) =>
      theater.some((other) => other.id === event.id)
    );
    expect(overlap).toHaveLength(0);
  });

  it("does not leak mutations of the returned array into internal state", () => {
    const events = getAllEvents();
    events.push({ ...events[0], id: "mutated-event" });

    expect(getAllEvents()).toHaveLength(10);
  });

  it("is deterministic across successive calls", () => {
    expect(getAllEvents()).toEqual(getAllEvents());
    expect(getFeaturedEvents()).toEqual(getFeaturedEvents());
    expect(getEventsByCategory("concert")).toEqual(
      getEventsByCategory("concert")
    );
    expect(getEventsByCategory("theater")).toEqual(
      getEventsByCategory("theater")
    );
  });
});

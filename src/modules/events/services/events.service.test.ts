import { describe, expect, it } from "vitest";
import {
  getAllEvents,
  getEventById,
  getRelatedEvents,
} from "@/modules/events/services/events.service";

describe("events.service", () => {
  it("getAllEvents returns all 10 mock events", () => {
    expect(getAllEvents()).toHaveLength(10);
  });

  it("does not leak mutations of the returned array into internal state", () => {
    const events = getAllEvents();
    events.push({ ...events[0], id: "mutated-event" });

    expect(getAllEvents()).toHaveLength(10);
  });

  it("is deterministic across successive calls", () => {
    expect(getAllEvents()).toEqual(getAllEvents());
  });

  describe("getEventById", () => {
    it("returns the event merged with its detail data", () => {
      const event = getEventById("concert-01");
      expect(event).toMatchObject({
        id: "concert-01",
        venue: "Estadio Nacional",
        layoutId: "stadium",
      });
      expect(event?.description.length).toBeGreaterThan(0);
    });

    it("returns undefined for an unknown id", () => {
      expect(getEventById("does-not-exist")).toBeUndefined();
    });

    it("has detail data for every mock event", () => {
      for (const event of getAllEvents()) {
        expect(getEventById(event.id)).toBeDefined();
      }
    });
  });

  describe("getRelatedEvents", () => {
    const concert = getAllEvents().find((event) => event.category === "concert")!;

    it("returns events of the same category, excluding the current one", () => {
      const related = getRelatedEvents(concert);
      expect(related.every((event) => event.category === "concert")).toBe(true);
      expect(related.some((event) => event.id === concert.id)).toBe(false);
    });

    it("limits the number of results (default 4)", () => {
      expect(getRelatedEvents(concert)).toHaveLength(4);
      expect(getRelatedEvents(concert, 2)).toHaveLength(2);
    });
  });
});

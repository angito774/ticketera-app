import { describe, expect, it } from "vitest";
import {
  getAllEvents,
  getEventById,
  getEventsByCategory,
  getEventFacets,
  getFeaturedEvents,
  getRelatedEvents,
  searchEvents,
} from "@/modules/events/services/events.service";
import {
  DEFAULT_EVENT_FILTERS,
  type EventFilters,
} from "@/modules/events/schemas/event-filters.schema";

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
    const [concert] = getEventsByCategory("concert");

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

  describe("searchEvents", () => {
    const search = (patch: Partial<EventFilters>) =>
      searchEvents({ ...DEFAULT_EVENT_FILTERS, ...patch }).map((event) => event.id);

    it("returns every event sorted by date by default", () => {
      const results = searchEvents(DEFAULT_EVENT_FILTERS);
      expect(results).toHaveLength(10);
      const times = results.map((event) => new Date(event.date).getTime());
      expect(times).toEqual([...times].sort((a, b) => a - b));
    });

    it("matches text ignoring case and accents, on title, venue and city", () => {
      expect(search({ q: "OPERA" })).toEqual(["theater-01"]);
      expect(search({ q: "trujillo" })).toEqual(["theater-04"]);
      expect(search({ q: "gran teatro" }).sort()).toEqual(["concert-02", "theater-01"]);
    });

    it("combines groups with AND and values inside a group with OR", () => {
      expect(search({ categories: ["theater"], cities: ["Lima", "Arequipa"] }).sort()).toEqual([
        "theater-01",
        "theater-02",
        "theater-03",
      ]);
      expect(search({ categories: ["concert"], month: "2026-11" }).sort()).toEqual([
        "concert-01",
        "concert-03",
      ]);
    });

    it("filters by price range (min, max]", () => {
      expect(search({ price: "0-100" }).sort()).toEqual(["theater-02", "theater-04"]);
      expect(search({ price: "300+" })).toEqual(["concert-01"]);
      expect(search({ price: "100-200" })).toHaveLength(5);
    });

    it("sorts by price", () => {
      const prices = searchEvents({ ...DEFAULT_EVENT_FILTERS, sort: "price" }).map((event) => event.price);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    });

    it("returns an empty list when nothing matches", () => {
      expect(search({ q: "no existe" })).toEqual([]);
    });
  });

  describe("getEventFacets", () => {
    const facets = getEventFacets();

    it("counts categories over all events", () => {
      expect(facets.categories).toEqual([
        { value: "concert", label: "Conciertos", count: 6 },
        { value: "theater", label: "Teatro y espectáculos", count: 4 },
      ]);
    });

    it("lists cities alphabetically with counts", () => {
      expect(facets.cities.map((city) => [city.value, city.count])).toEqual([
        ["Arequipa", 2],
        ["Cusco", 1],
        ["Huancayo", 1],
        ["Lima", 5],
        ["Trujillo", 1],
      ]);
    });

    it("lists months chronologically with readable labels", () => {
      expect(facets.months.map((month) => month.label)).toEqual([
        "Octubre 2026",
        "Noviembre 2026",
        "Diciembre 2026",
        "Enero 2027",
      ]);
      expect(facets.months.reduce((total, month) => total + month.count, 0)).toBe(10);
    });
  });
});

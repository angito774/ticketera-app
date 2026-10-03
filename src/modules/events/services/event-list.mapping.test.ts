import { describe, expect, it } from "vitest";

import {
  limaMonthRange,
  mapPublicEvent,
  monthLabel,
  PLACEHOLDER_EVENT_IMAGE_URL,
  toLimaIso,
} from "@/modules/events/services/event-list.mapping";

describe("toLimaIso", () => {
  it("expresa el instante con offset -05:00", () => {
    expect(toLimaIso(new Date("2026-11-15T01:00:00Z"))).toBe("2026-11-14T20:00:00-05:00");
  });
});

describe("limaMonthRange", () => {
  it("va del primer día 00:00 Lima al primer día del mes siguiente", () => {
    const { start, end } = limaMonthRange("2026-11");
    expect(start.toISOString()).toBe("2026-11-01T05:00:00.000Z");
    expect(end.toISOString()).toBe("2026-12-01T05:00:00.000Z");
  });

  it("cruza el año en diciembre", () => {
    expect(limaMonthRange("2026-12").end.toISOString()).toBe("2027-01-01T05:00:00.000Z");
  });
});

describe("monthLabel", () => {
  it("capitaliza y quita la preposición", () => {
    expect(monthLabel("2026-11")).toBe("Noviembre 2026");
  });
});

describe("mapPublicEvent", () => {
  const base = {
    slug: "concert-01",
    title: "Show",
    categorySlug: "concert",
    startsAt: new Date("2026-11-15T01:00:00Z"),
    venueName: "Estadio",
    city: "Lima",
    minPriceCents: 35000,
    coverImageUrl: null,
    featured: true,
  };

  it("mapea al tipo Event con precio en soles y placeholder", () => {
    expect(mapPublicEvent(base)).toEqual({
      id: "concert-01",
      title: "Show",
      category: "concert",
      date: "2026-11-14T20:00:00-05:00",
      venue: "Estadio",
      city: "Lima",
      price: 350,
      imageUrl: PLACEHOLDER_EVENT_IMAGE_URL,
      featured: true,
    });
  });

  it("usa precio 0 sin tipos de entrada y respeta la portada", () => {
    const event = mapPublicEvent({ ...base, minPriceCents: null, coverImageUrl: "https://x/y.jpg" });
    expect(event.price).toBe(0);
    expect(event.imageUrl).toBe("https://x/y.jpg");
  });
});

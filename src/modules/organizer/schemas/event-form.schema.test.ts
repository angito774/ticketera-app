import { describe, expect, it } from "vitest";

import {
  EMPTY_EVENT_FORM,
  getEventFormErrors,
  hasFormErrors,
  toFormValues,
  toOrganizerEvent,
  toStartsAt,
  type EventFormValues,
} from "@/modules/organizer/schemas/event-form.schema";

const NOW = new Date("2026-09-29T12:00:00-05:00");

const VALID: EventFormValues = {
  title: "Festival de verano",
  category: "concert",
  description: "Tres escenarios, doce bandas y zona gastronómica.",
  date: "2026-12-20",
  time: "18:30",
  venue: "Explanada Costa Verde",
  city: "Lima",
  imageUrl: null,
  tiers: [
    { name: "General", price: "120", quantity: "3000" },
    { name: "VIP", price: "250.5", quantity: "500" },
  ],
};

describe("getEventFormErrors", () => {
  it("accepts a complete event to publish", () => {
    expect(getEventFormErrors(VALID, "publish", NOW)).toEqual({});
  });

  it("only requires the title for a draft", () => {
    expect(getEventFormErrors({ ...EMPTY_EVENT_FORM, title: "Borrador" }, "draft", NOW)).toEqual({});
    expect(Object.keys(getEventFormErrors(EMPTY_EVENT_FORM, "draft", NOW))).toEqual(["title"]);
  });

  it("reports every missing field when publishing an empty form", () => {
    const errors = getEventFormErrors(EMPTY_EVENT_FORM, "publish", NOW);
    expect(Object.keys(errors).sort()).toEqual(
      ["category", "city", "date", "description", "tierErrors", "time", "title", "venue"].sort()
    );
    expect(errors.tierErrors).toEqual([
      { name: "Ponle un nombre.", price: "Ingresa un precio.", quantity: "Ingresa una cantidad." },
      { name: "Ponle un nombre.", price: "Ingresa un precio.", quantity: "Ingresa una cantidad." },
    ]);
  });

  it("rejects past dates", () => {
    expect(getEventFormErrors({ ...VALID, date: "2026-09-29", time: "11:00" }, "publish", NOW).date).toBe(
      "La fecha debe ser futura."
    );
  });

  it("validates each ticket tier on its own row", () => {
    const errors = getEventFormErrors(
      { ...VALID, tiers: [VALID.tiers[0], { name: "VIP", price: "0", quantity: "2.5" }] },
      "publish",
      NOW
    );
    expect(errors.tierErrors).toEqual([
      {},
      { price: "El precio debe ser mayor a 0.", quantity: "Usa un número entero." },
    ]);
  });

  it("requires at least one tier", () => {
    expect(getEventFormErrors({ ...VALID, tiers: [] }, "publish", NOW).tiers).toBeDefined();
  });

  it("hasFormErrors detects errors", () => {
    expect(hasFormErrors({})).toBe(false);
    expect(hasFormErrors({ title: "x" })).toBe(true);
  });
});

describe("toStartsAt", () => {
  it("builds an ISO date in Lima time", () => {
    expect(toStartsAt("2026-12-20", "18:30")).toBe("2026-12-20T18:30:00-05:00");
    expect(toStartsAt("2026-12-20", "")).toBe("2026-12-20T00:00:00-05:00");
    expect(toStartsAt("", "18:30")).toBeNull();
  });
});

describe("conversions", () => {
  it("toOrganizerEvent parses numbers, trims text, drops blank tiers and blob images", () => {
    const event = toOrganizerEvent(
      { ...VALID, title: "  Festival de verano ", imageUrl: "blob:http://x/1", tiers: [...VALID.tiers, { name: "", price: "", quantity: "" }] },
      "published",
      "org-1"
    );
    expect(event).toMatchObject({
      id: "org-1",
      status: "published",
      title: "Festival de verano",
      startsAt: "2026-12-20T18:30:00-05:00",
      imageUrl: null,
      tiers: [
        { name: "General", price: 120, quantity: 3000, sold: 0 },
        { name: "VIP", price: 250.5, quantity: 500, sold: 0 },
      ],
    });
  });

  it("toFormValues round-trips an event", () => {
    const event = toOrganizerEvent(VALID, "draft", "org-2");
    expect(toFormValues(event)).toEqual(VALID);
  });
});

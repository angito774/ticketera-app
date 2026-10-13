import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  EMPTY_EVENT_FORM,
  eventSaveSchema,
  eventUpdateSchema,
  getEventFormErrors,
  hasFormErrors,
  toEventSaveInput,
  toStartsAt,
  type EventFormValues,
  type ZoneOption,
} from "@/modules/organizer/schemas/event-form.schema";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const [CAT, VEN, ORG, EV, Z_GEN, Z_NUM, Z_X] = [1, 2, 3, 4, 5, 6, 7].map(uuid);
const COVER_OK = "https://images.unsplash.com/photo-1?w=800";

const ZONES: ZoneOption[] = [
  { id: Z_GEN, name: "General", seating: "general", seats: 0 },
  { id: Z_NUM, name: "Platea", seating: "numbered", seats: 200 },
];

const VALID: EventFormValues = {
  title: "Festival de verano",
  categoryId: CAT,
  description: "Tres escenarios, doce bandas y zona gastronómica.",
  date: "2026-12-20",
  time: "18:30",
  venueId: VEN,
  coverImageUrl: "",
  organizationId: ORG,
  featured: false,
  tiers: [
    { zoneId: Z_GEN, enabled: true, price: "120", quantity: "3000" },
    { zoneId: Z_NUM, enabled: true, price: "250.5", quantity: "" },
  ],
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-29T12:00:00-05:00"));
});
afterEach(() => vi.useRealTimers());

describe("toStartsAt", () => {
  it("builds an ISO string in Lima time", () => {
    expect(toStartsAt("2026-12-20", "18:30")).toBe("2026-12-20T18:30:00-05:00");
  });
  it("falls back to midnight when the time is invalid", () => {
    expect(toStartsAt("2026-12-20", "")).toBe("2026-12-20T00:00:00-05:00");
  });
  it("returns null for missing or impossible dates", () => {
    expect(toStartsAt("", "10:00")).toBeNull();
    expect(toStartsAt("2026-02-31", "10:00")).toBeNull();
    expect(toStartsAt("20/12/2026", "10:00")).toBeNull();
  });
});

describe("getEventFormErrors", () => {
  it("accepts a complete event to publish", () => {
    expect(getEventFormErrors(VALID, "publish", ZONES)).toEqual({});
  });

  it("requires title, organization, category, venue and date/time for a draft", () => {
    expect(Object.keys(getEventFormErrors(EMPTY_EVENT_FORM, "draft", ZONES)).sort()).toEqual(
      ["categoryId", "date", "organizationId", "time", "title", "venueId"].sort()
    );
  });

  it("does not require description, cover, tiers or a future date for a draft", () => {
    const draft = { ...VALID, description: "", tiers: [], date: "2020-01-01" };
    expect(getEventFormErrors(draft, "draft", ZONES)).toEqual({});
    expect(getEventFormErrors({ ...draft, date: "2026-02-31" }, "draft", ZONES).date).toBe("Elige una fecha válida.");
  });

  it("allows incomplete enabled tiers in a draft but not invalid values", () => {
    const blank = { ...VALID, tiers: [{ zoneId: Z_GEN, enabled: true, price: "", quantity: "" }] };
    expect(getEventFormErrors(blank, "draft", ZONES)).toEqual({});
    const free = { ...VALID, tiers: [{ zoneId: Z_GEN, enabled: true, price: "0", quantity: "10" }] };
    expect(getEventFormErrors(free, "draft", ZONES)).toEqual({});
    const bad = { ...VALID, tiers: [{ zoneId: Z_GEN, enabled: true, price: "-1", quantity: "0" }] };
    expect(getEventFormErrors(bad, "draft", ZONES).tierErrors).toEqual([
      { price: "Ingresa un precio válido (máximo 2 decimales).", quantity: "Usa un número entero mayor a 0." },
    ]);
  });

  it("reports every missing field when publishing an empty form", () => {
    const errors = getEventFormErrors(EMPTY_EVENT_FORM, "publish", ZONES);
    expect(Object.keys(errors).sort()).toEqual(
      ["categoryId", "date", "description", "organizationId", "tiers", "time", "title", "venueId"].sort()
    );
  });

  it("rejects past dates and accepts future ones", () => {
    expect(getEventFormErrors({ ...VALID, date: "2026-09-29", time: "11:00" }, "publish", ZONES).date).toBe(
      "La fecha debe ser futura."
    );
    expect(getEventFormErrors({ ...VALID, date: "2026-09-29", time: "13:00" }, "publish", ZONES).date).toBeUndefined();
  });

  it("rejects an impossible date", () => {
    expect(getEventFormErrors({ ...VALID, date: "2026-02-31" }, "publish", ZONES).date).toBe("Elige una fecha válida.");
  });

  it("validates the cover URL always, and it stays optional", () => {
    const cover = (coverImageUrl: string, mode: "draft" | "publish") =>
      getEventFormErrors({ ...VALID, coverImageUrl }, mode, ZONES);
    expect(cover("ftp://x.com/a.png", "draft").coverImageUrl).toBeTruthy();
    expect(cover("nope", "publish").coverImageUrl).toBeTruthy();
    expect(cover("http://images.unsplash.com/a.png", "publish").coverImageUrl).toBeTruthy();
    expect(cover("https://x.com/a.png", "publish").coverImageUrl).toBe(
      "Usa una imagen https de un dominio permitido (images.unsplash.com)."
    );
    expect(cover(COVER_OK, "publish")).toEqual({});
    expect(cover("", "publish")).toEqual({});
  });

  it("rejects prices with more than 2 decimals, commas and out of range values", () => {
    const price = (value: string) =>
      getEventFormErrors(
        { ...VALID, tiers: [{ zoneId: Z_NUM, enabled: true, price: value, quantity: "" }] },
        "draft",
        ZONES
      ).tierErrors?.[0]?.price;
    expect(price("1.005")).toBeTruthy();
    expect(price("1,5")).toBeTruthy();
    expect(price("1.05")).toBeUndefined();
    expect(price(" 12 ")).toBeUndefined();
    expect(price("99999999999")).toBeTruthy();
  });

  it("rejects quantities above the integer limit", () => {
    const errors = getEventFormErrors(
      { ...VALID, tiers: [{ zoneId: Z_GEN, enabled: true, price: "10", quantity: "2147483648" }] },
      "publish",
      ZONES
    );
    expect(errors.tierErrors?.[0]?.quantity).toBeTruthy();
  });

  it("requires at least one enabled tier", () => {
    const values = { ...VALID, tiers: VALID.tiers.map((tier) => ({ ...tier, enabled: false })) };
    expect(getEventFormErrors(values, "publish", ZONES).tiers).toBe("Habilita al menos un tipo de entrada.");
  });

  it("validates price and quantity per tier, aligned by index", () => {
    const errors = getEventFormErrors(
      {
        ...VALID,
        tiers: [
          { zoneId: Z_GEN, enabled: true, price: "0", quantity: "2.5" },
          { zoneId: Z_NUM, enabled: true, price: "", quantity: "abc" },
        ],
      },
      "publish",
      ZONES
    );
    expect(errors.tierErrors).toEqual([
      { price: "El precio debe ser mayor a 0.", quantity: "Usa un número entero mayor a 0." },
      { price: "Ingresa un precio." },
    ]);
  });

  it("requires quantity only on general zones", () => {
    const errors = getEventFormErrors(
      { ...VALID, tiers: [{ zoneId: Z_GEN, enabled: true, price: "10", quantity: "" }] },
      "publish",
      ZONES
    );
    expect(errors.tierErrors).toEqual([{ quantity: "Ingresa una cantidad." }]);
  });

  it("ignores disabled tiers", () => {
    const values = {
      ...VALID,
      tiers: [VALID.tiers[0], { zoneId: Z_NUM, enabled: false, price: "", quantity: "" }],
    };
    expect(getEventFormErrors(values, "publish", ZONES)).toEqual({});
  });
});

describe("hasFormErrors", () => {
  it("detects errors", () => {
    expect(hasFormErrors({})).toBe(false);
    expect(hasFormErrors({ title: "x" })).toBe(true);
  });
});

describe("toEventSaveInput", () => {
  it("converts soles to cents with rounding and keeps only enabled tiers", () => {
    const input = toEventSaveInput(
      {
        ...VALID,
        title: "  Festival  ",
        tiers: [
          { zoneId: Z_GEN, enabled: true, price: "10.05", quantity: " 300 " },
          { zoneId: Z_X, enabled: true, price: "1.05", quantity: "" },
          { zoneId: Z_NUM, enabled: true, price: "250.5", quantity: "99" },
          { zoneId: Z_X, enabled: false, price: "1", quantity: "1" },
        ],
      },
      "publish",
      ZONES
    );
    expect(input).toEqual({
      mode: "publish",
      organizationId: ORG,
      title: "Festival",
      categoryId: CAT,
      description: VALID.description,
      startsAt: "2026-12-20T18:30:00-05:00",
      venueId: VEN,
      coverImageUrl: null,
      featured: false,
      tiers: [
        { zoneId: Z_GEN, priceCents: 1005, quantity: 300 },
        { zoneId: Z_X, priceCents: 105, quantity: null },
        { zoneId: Z_NUM, priceCents: 25050, quantity: null },
      ],
    });
  });

  it("maps empty optional fields to null and invalid numbers to safe values in a draft", () => {
    const input = toEventSaveInput(
      {
        ...EMPTY_EVENT_FORM,
        title: "B",
        organizationId: ORG,
        tiers: [{ zoneId: Z_GEN, enabled: true, price: "", quantity: "" }],
      },
      "draft",
      ZONES
    );
    expect(input).toMatchObject({
      categoryId: null,
      description: null,
      startsAt: null,
      venueId: null,
      coverImageUrl: null,
      tiers: [{ zoneId: Z_GEN, priceCents: 0, quantity: null }],
    });
  });
});

describe("eventSaveSchema", () => {
  const publish = () => toEventSaveInput(VALID, "publish", ZONES);
  const draft = () => toEventSaveInput({ ...VALID, title: "Hola" }, "draft", ZONES);

  it("accepts a valid publish payload", () => {
    expect(eventSaveSchema.safeParse(publish()).success).toBe(true);
  });

  it("accepts a minimal draft with a past date", () => {
    const result = eventSaveSchema.safeParse({
      ...draft(),
      description: null,
      startsAt: "2020-01-01T10:00:00-05:00",
      tiers: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects null category, venue and startsAt in both modes", () => {
    for (const mode of ["draft", "publish"] as const) {
      for (const patch of [{ categoryId: null }, { venueId: null }, { startsAt: null }]) {
        expect(eventSaveSchema.safeParse({ ...publish(), ...patch, mode }).success, `${mode} ${JSON.stringify(patch)}`).toBe(
          false
        );
      }
    }
  });

  it("trims strings and normalizes blanks to null", () => {
    const result = eventSaveSchema.parse({ ...publish(), title: "  Fest  ", coverImageUrl: "   " });
    expect(result.title).toBe("Fest");
    expect(result.coverImageUrl).toBeNull();
  });

  it("enforces publish-only requirements", () => {
    const base = publish();
    const patches: Record<string, unknown>[] = [
      { description: "corta" },
      { description: null },
      { startsAt: "2026-09-01T10:00:00-05:00" },
      { tiers: [] },
      { tiers: [{ zoneId: Z_X, priceCents: 0, quantity: null }] },
    ];
    for (const patch of patches) {
      expect(eventSaveSchema.safeParse({ ...base, ...patch }).success, JSON.stringify(patch)).toBe(false);
      expect(eventSaveSchema.safeParse({ ...base, ...patch, mode: "draft" }).success, JSON.stringify(patch)).toBe(true);
    }
  });

  it("allows a zero price in a draft but not negative", () => {
    const tiers = (priceCents: number) => [{ zoneId: Z_X, priceCents, quantity: null }];
    expect(eventSaveSchema.safeParse({ ...draft(), tiers: tiers(0) }).success).toBe(true);
    expect(eventSaveSchema.safeParse({ ...draft(), tiers: tiers(-1) }).success).toBe(false);
  });

  it("rejects bad quantities and non integer cents", () => {
    const one = (t: object) => ({ ...publish(), tiers: [{ zoneId: Z_X, priceCents: 100, quantity: null, ...t }] });
    expect(eventSaveSchema.safeParse(one({ quantity: 0 })).success).toBe(false);
    expect(eventSaveSchema.safeParse(one({ quantity: 1.5 })).success).toBe(false);
    expect(eventSaveSchema.safeParse(one({ quantity: 5 })).success).toBe(true);
    expect(eventSaveSchema.safeParse(one({ priceCents: 10.5 })).success).toBe(false);
  });

  it("rejects duplicated zones and more than 50 tiers", () => {
    const tier = { zoneId: Z_X, priceCents: 100, quantity: null };
    expect(eventSaveSchema.safeParse({ ...publish(), tiers: [tier, tier] }).success).toBe(false);
    const many = Array.from({ length: 51 }, (_, i) => ({ ...tier, zoneId: uuid(i + 100) }));
    expect(eventSaveSchema.safeParse({ ...publish(), tiers: many }).success).toBe(false);
  });

  it("enforces length limits and URL protocol", () => {
    const withCover = (coverImageUrl: string) => eventSaveSchema.safeParse({ ...publish(), coverImageUrl }).success;
    expect(eventSaveSchema.safeParse({ ...publish(), title: "a".repeat(121) }).success).toBe(false);
    expect(eventSaveSchema.safeParse({ ...publish(), description: "a".repeat(5001) }).success).toBe(false);
    expect(withCover(`https://images.unsplash.com/${"a".repeat(500)}`)).toBe(false);
    expect(withCover("javascript:alert(1)")).toBe(false);
    expect(withCover("http://images.unsplash.com/a.png")).toBe(false);
    expect(withCover("https://x.com/a.png")).toBe(false);
    expect(withCover("https://images.unsplash.com.evil.com/a.png")).toBe(false);
    expect(withCover(COVER_OK)).toBe(true);
  });

  it("requires uuids for ids", () => {
    for (const patch of [{ organizationId: "org-1" }, { categoryId: "x" }, { venueId: "x" }]) {
      expect(eventSaveSchema.safeParse({ ...publish(), ...patch }).success, JSON.stringify(patch)).toBe(false);
    }
    const tier = { zoneId: "z", priceCents: 100, quantity: null };
    expect(eventSaveSchema.safeParse({ ...publish(), tiers: [tier] }).success).toBe(false);
  });

  it("rejects integers above the 32-bit limit", () => {
    const one = (t: object) => ({ ...publish(), tiers: [{ zoneId: Z_X, priceCents: 100, quantity: 5, ...t }] });
    expect(eventSaveSchema.safeParse(one({ priceCents: 2_147_483_647 })).success).toBe(true);
    expect(eventSaveSchema.safeParse(one({ priceCents: 2_147_483_648 })).success).toBe(false);
    expect(eventSaveSchema.safeParse(one({ quantity: 2_147_483_648 })).success).toBe(false);
  });

  it("sends featured always and accepts it as optional boolean", () => {
    expect(EMPTY_EVENT_FORM.featured).toBe(false);
    expect(toEventSaveInput({ ...VALID, featured: true }, "publish", ZONES).featured).toBe(true);
    expect(eventSaveSchema.safeParse({ ...publish(), featured: true }).success).toBe(true);
    expect(eventSaveSchema.safeParse({ ...publish(), featured: undefined }).success).toBe(true);
    expect(eventSaveSchema.safeParse({ ...publish(), featured: "yes" }).success).toBe(false);
  });

  it("requires title of 3 chars and a non-empty organization", () => {
    expect(eventSaveSchema.safeParse({ ...draft(), title: "ab" }).success).toBe(false);
    expect(eventSaveSchema.safeParse({ ...draft(), organizationId: "  " }).success).toBe(false);
  });
});

describe("eventUpdateSchema", () => {
  it("requires an id and applies the same rules", () => {
    const payload = toEventSaveInput(VALID, "publish", ZONES);
    expect(eventUpdateSchema.safeParse(payload).success).toBe(false);
    expect(eventUpdateSchema.safeParse({ ...payload, id: EV }).success).toBe(true);
    expect(eventUpdateSchema.safeParse({ ...payload, id: "ev-1" }).success).toBe(false);
    expect(eventUpdateSchema.safeParse({ ...payload, id: EV, venueId: null }).success).toBe(false);
  });
});

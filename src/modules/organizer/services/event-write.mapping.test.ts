import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import type { EventSaveInput } from "@/modules/organizer/schemas/event-form.schema";
import {
  INSERT_CHUNK,
  buildEventSeatRows,
  chunkRows,
} from "@/modules/organizer/services/event-seats";
import {
  EventRuleError,
  assertPublishable,
  buildTicketTypeRows,
  draftGuardSql,
  nextSlug,
  requireEventColumns,
  resolveFeatured,
  type ZoneInfo,
} from "@/modules/organizer/services/event-write.mapping";

describe("resolveFeatured", () => {
  it("persiste el valor solo si el actor puede destacar", () => {
    expect(resolveFeatured(true, true)).toEqual({ featured: true });
    expect(resolveFeatured(true, false)).toEqual({ featured: false });
  });

  it("ignora el valor sin permiso", () => {
    expect(resolveFeatured(false, true)).toEqual({});
    expect(resolveFeatured(false, false)).toEqual({});
  });

  it("no toca la columna si no se envía", () => {
    expect(resolveFeatured(true, undefined)).toEqual({});
  });
});

const NOW = new Date("2026-10-02T12:00:00Z");
const zones: ZoneInfo[] = [
  { id: "z-gen", name: "General", seating: "general" },
  { id: "z-num", name: "Platea", seating: "numbered" },
];

function input(overrides: Partial<EventSaveInput> = {}): EventSaveInput {
  return {
    mode: "publish",
    organizationId: "org_1",
    title: "Concierto",
    categoryId: "cat",
    description: "Una descripción suficientemente larga",
    startsAt: "2026-12-01T20:00:00Z",
    venueId: "venue",
    coverImageUrl: null,
    tiers: [{ zoneId: "z-gen", priceCents: 5000, quantity: 100 }],
    ...overrides,
  };
}

describe("nextSlug", () => {
  it("devuelve la base si está libre", () => {
    expect(nextSlug("rock", ["jazz"])).toBe("rock");
  });
  it("agrega sufijo -2, -3 si hay colisión", () => {
    expect(nextSlug("rock", ["rock"])).toBe("rock-2");
    expect(nextSlug("rock", ["rock", "rock-2"])).toBe("rock-3");
  });
  it("usa un valor por defecto si la base queda vacía", () => {
    expect(nextSlug("", [])).toBe("evento");
  });
});

describe("buildTicketTypeRows", () => {
  let n = 0;
  const newId = () => `id-${++n}`;

  it("zona general conserva cantidad y numerada la ignora", () => {
    const rows = buildTicketTypeRows({
      mode: "publish",
      eventId: "e",
      zones,
      newId,
      tiers: [
        { zoneId: "z-gen", priceCents: 5000, quantity: 80 },
        { zoneId: "z-num", priceCents: 9000, quantity: 10 },
      ],
    });
    expect(rows).toMatchObject([
      { eventId: "e", venueZoneId: "z-gen", name: "General", price: 5000, quantityTotal: 80 },
      { venueZoneId: "z-num", name: "Platea", price: 9000, quantityTotal: null },
    ]);
    expect(rows[0].id).not.toBe(rows[1].id);
  });

  it("en borrador acepta general sin cantidad pero valida la que venga", () => {
    const base = { mode: "draft" as const, eventId: "e", zones, newId };
    const rows = buildTicketTypeRows({
      ...base,
      tiers: [{ zoneId: "z-gen", priceCents: 1, quantity: null }],
    });
    expect(rows[0].quantityTotal).toBeNull();
    for (const quantity of [0, -3, 1.5]) {
      expect(() =>
        buildTicketTypeRows({ ...base, tiers: [{ zoneId: "z-gen", priceCents: 1, quantity }] }),
      ).toThrow(EventRuleError);
    }
  });

  it("rechaza zona general sin cantidad, zona ajena y zona repetida", () => {
    const base = { mode: "publish" as const, eventId: "e", zones, newId };
    expect(() =>
      buildTicketTypeRows({ ...base, tiers: [{ zoneId: "z-gen", priceCents: 1, quantity: null }] }),
    ).toThrow(EventRuleError);
    expect(() =>
      buildTicketTypeRows({ ...base, tiers: [{ zoneId: "otra", priceCents: 1, quantity: 1 }] }),
    ).toThrow(EventRuleError);
    expect(() =>
      buildTicketTypeRows({
        ...base,
        tiers: [
          { zoneId: "z-gen", priceCents: 1, quantity: 1 },
          { zoneId: "z-gen", priceCents: 1, quantity: 1 },
        ],
      }),
    ).toThrow(EventRuleError);
  });
});

describe("buildEventSeatRows / chunkRows", () => {
  it("copia cada asiento del recinto como disponible", () => {
    expect(buildEventSeatRows({ eventId: "e", ticketTypeId: "t", venueSeatIds: ["a", "b"] })).toEqual([
      { eventId: "e", ticketTypeId: "t", venueSeatId: "a", status: "available" },
      { eventId: "e", ticketTypeId: "t", venueSeatId: "b", status: "available" },
    ]);
  });
  it("parte en lotes de INSERT_CHUNK", () => {
    const lots = chunkRows(Array.from({ length: INSERT_CHUNK * 2 + 200 }, (_, i) => i));
    expect(lots.map((l) => l.length)).toEqual([INSERT_CHUNK, INSERT_CHUNK, 200]);
    expect(chunkRows([])).toEqual([]);
    expect(INSERT_CHUNK * 4).toBeLessThanOrEqual(65535);
  });
});

describe("draft guard", () => {
  it("el guard consulta el estado draft del evento con el id parametrizado", () => {
    const { sql: text, params } = new PgDialect().sqlToQuery(draftGuardSql("evt-1"));
    expect(text).toContain("status = 'draft'");
    expect(params).toEqual(["evt-1"]);
  });

  it("no usa una división por cero constante (Postgres la evaluaría al planificar y fallaría siempre)", () => {
    const { sql: text } = new PgDialect().sqlToQuery(draftGuardSql("evt-1"));
    expect(text).not.toMatch(/1\s*\/\s*0/);
    expect(text).toMatch(/1\s*\/\s*\(select count\(\*\)/i);
  });
});

describe("requireEventColumns", () => {
  it("exige título, categoría, recinto y fecha válida", () => {
    expect(requireEventColumns(input()).startsAt).toEqual(new Date("2026-12-01T20:00:00Z"));
    expect(() => requireEventColumns(input({ title: "ab" }))).toThrow(EventRuleError);
    expect(() => requireEventColumns(input({ venueId: null }))).toThrow(EventRuleError);
    expect(() => requireEventColumns(input({ startsAt: "no-fecha" }))).toThrow(EventRuleError);
  });
});

describe("assertPublishable", () => {
  it("acepta un evento completo", () => {
    expect(() => assertPublishable(input(), zones, NOW)).not.toThrow();
  });

  it.each([
    ["sin categoría", { categoryId: null }],
    ["descripción corta", { description: "corta" }],
    ["sin descripción", { description: null }],
    ["fecha pasada", { startsAt: "2026-01-01T00:00:00Z" }],
    ["sin fecha", { startsAt: null }],
    ["sin recinto", { venueId: null }],
    ["sin entradas", { tiers: [] }],
    ["precio 0", { tiers: [{ zoneId: "z-gen", priceCents: 0, quantity: 10 }] }],
    ["general sin cantidad", { tiers: [{ zoneId: "z-gen", priceCents: 100, quantity: null }] }],
    ["general con cantidad 0", { tiers: [{ zoneId: "z-gen", priceCents: 100, quantity: 0 }] }],
  ] as [string, Partial<EventSaveInput>][])("rechaza %s", (_name, overrides) => {
    expect(() => assertPublishable(input(overrides), zones, NOW)).toThrow(EventRuleError);
  });

  it("zona numerada no necesita cantidad", () => {
    const numbered = input({ tiers: [{ zoneId: "z-num", priceCents: 100, quantity: null }] });
    expect(() => assertPublishable(numbered, zones, NOW)).not.toThrow();
  });
});

import { describe, expect, it } from "vitest";

import {
  eventListKey,
  eventListToSearchParams,
  parseEventListParams,
} from "@/modules/events/schemas/event-list.schema";

const fromQuery = (qs: string) =>
  parseEventListParams(
    Object.fromEntries(
      [...new URLSearchParams(qs).keys()].map((k) => {
        const all = new URLSearchParams(qs).getAll(k);
        return [k, all.length > 1 ? all : all[0]];
      }),
    ),
  );

describe("parseEventListParams", () => {
  it("aplica los valores por defecto", () => {
    expect(parseEventListParams({})).toEqual({
      scope: "public",
      q: "",
      categories: [],
      cities: [],
      month: null,
      price: null,
      sort: "date",
      status: "all",
      page: 1,
      pageSize: 50,
    });
  });

  it("reusa los filtros de búsqueda", () => {
    const p = parseEventListParams({ q: " rock ", category: ["concert", "x"], price: "0-100", sort: "price" });
    expect(p).toMatchObject({ q: "rock", categories: ["concert"], price: "0-100", sort: "price" });
  });

  it("scope desconocido cae a public", () => {
    expect(parseEventListParams({ scope: "admin" }).scope).toBe("public");
  });

  it("status y organizationId solo aplican con scope organizer", () => {
    const pub = parseEventListParams({ status: "draft", organizationId: "o1" });
    expect(pub.status).toBe("all");
    expect(pub.organizationId).toBeUndefined();
    const org = parseEventListParams({ scope: "organizer", status: "draft", organizationId: " o1 " });
    expect(org.status).toBe("draft");
    expect(org.organizationId).toBe("o1");
    expect(parseEventListParams({ scope: "organizer", status: "zzz" }).status).toBe("all");
  });

  it("status=cancelled solo aplica con scope organizer", () => {
    expect(parseEventListParams({ scope: "organizer", status: "cancelled" }).status).toBe("cancelled");
    expect(parseEventListParams({ status: "cancelled" }).status).toBe("all");
    const p = parseEventListParams({ scope: "organizer", status: "cancelled" });
    expect(eventListToSearchParams(p).get("status")).toBe("cancelled");
    expect(fromQuery(eventListToSearchParams(p).toString())).toEqual(p);
  });

  it("featured solo acepta true", () => {
    expect(parseEventListParams({ featured: "true" }).featured).toBe(true);
    expect(parseEventListParams({ featured: "false" }).featured).toBeUndefined();
    expect(parseEventListParams({ featured: "1" }).featured).toBeUndefined();
  });

  it("page y pageSize inválidos se ignoran y pageSize se acota a 50", () => {
    expect(parseEventListParams({ page: "abc", pageSize: "-3" })).toMatchObject({ page: 1, pageSize: 50 });
    expect(parseEventListParams({ page: "0" }).page).toBe(1);
    expect(parseEventListParams({ page: "3", pageSize: "20" })).toMatchObject({ page: 3, pageSize: 20 });
    expect(parseEventListParams({ pageSize: "500" }).pageSize).toBe(50);
    expect(parseEventListParams({ pageSize: "0" }).pageSize).toBe(50);
  });
});

describe("eventListToSearchParams", () => {
  it("es ida y vuelta con parseEventListParams", () => {
    const original = parseEventListParams({
      scope: "organizer",
      q: "jazz",
      category: ["theater", "concert"],
      city: ["Lima"],
      month: "2026-11",
      price: "100-200",
      sort: "price",
      featured: "true",
      status: "published",
      organizationId: "org-1",
      page: "2",
      pageSize: "10",
    });
    const again = fromQuery(eventListToSearchParams(original).toString());
    expect(again).toEqual(original);
    expect(eventListToSearchParams(again).toString()).toBe(eventListToSearchParams(original).toString());
  });

  it("omite valores por defecto y no serializa status en public", () => {
    expect(eventListToSearchParams(parseEventListParams({})).toString()).toBe("scope=public");
    const p = { ...parseEventListParams({}), status: "draft" as const };
    expect(eventListToSearchParams(p).has("status")).toBe(false);
  });
});

describe("eventListKey", () => {
  it("es estable para parámetros equivalentes", () => {
    const a = parseEventListParams({ category: ["theater", "concert"], city: ["Lima", "Cusco", "Lima"], q: " x " });
    const b = parseEventListParams({ q: "x", city: ["Cusco", "Lima"], category: ["concert", "theater"] });
    expect(eventListKey(a)).toEqual(eventListKey(b));
  });

  it("difiere entre alcances y filtros distintos", () => {
    const base = parseEventListParams({});
    expect(eventListKey(base)).not.toEqual(eventListKey(parseEventListParams({ scope: "organizer" })));
    expect(eventListKey(base)).not.toEqual(eventListKey(parseEventListParams({ page: "2" })));
  });

  it("ignora status en public", () => {
    const base = parseEventListParams({});
    expect(eventListKey({ ...base, status: "draft" })).toEqual(eventListKey(base));
  });
});

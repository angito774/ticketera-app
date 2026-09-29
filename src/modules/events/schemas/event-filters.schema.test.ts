import { describe, expect, it } from "vitest";

import {
  DEFAULT_EVENT_FILTERS,
  countActiveFilters,
  parseEventFilters,
  toSearchParams,
  type EventFilters,
} from "@/modules/events/schemas/event-filters.schema";

describe("parseEventFilters", () => {
  it("returns the defaults for empty params", () => {
    expect(parseEventFilters({})).toEqual(DEFAULT_EVENT_FILTERS);
  });

  it("parses single and repeated values", () => {
    expect(
      parseEventFilters({
        q: "  rock ",
        category: ["concert", "theater", "concert"],
        city: "Lima",
        month: "2026-11",
        price: "100-200",
        sort: "price",
      })
    ).toEqual({
      q: "rock",
      categories: ["concert", "theater"],
      cities: ["Lima"],
      month: "2026-11",
      price: "100-200",
      sort: "price",
    });
  });

  it("ignores invalid or unknown values", () => {
    expect(
      parseEventFilters({
        category: ["sports", "theater"],
        city: ["", "Cusco"],
        month: "2026-13",
        price: "foo",
        sort: "bar",
      })
    ).toEqual({
      ...DEFAULT_EVENT_FILTERS,
      categories: ["theater"],
      cities: ["Cusco"],
    });
  });

  it("uses the first value when a single-value key is repeated", () => {
    expect(parseEventFilters({ price: ["300+", "0-100"] }).price).toBe("300+");
  });
});

describe("toSearchParams", () => {
  it("omits defaults", () => {
    expect(toSearchParams(DEFAULT_EVENT_FILTERS).toString()).toBe("");
  });

  it("round-trips through parseEventFilters", () => {
    const filters: EventFilters = {
      q: "ópera",
      categories: ["theater"],
      cities: ["Lima", "Arequipa"],
      month: "2026-11",
      price: "0-100",
      sort: "price",
    };
    const params = toSearchParams(filters);
    const record: Record<string, string | string[]> = {};
    for (const key of new Set(params.keys())) {
      const values = params.getAll(key);
      record[key] = values.length > 1 ? values : values[0];
    }
    expect(parseEventFilters(record)).toEqual(filters);
  });
});

describe("countActiveFilters", () => {
  const filters: EventFilters = {
    ...DEFAULT_EVENT_FILTERS,
    q: "rock",
    categories: ["concert"],
    cities: ["Lima", "Cusco"],
    price: "300+",
  };

  it("counts values in every group by default, ignoring text and sort", () => {
    expect(countActiveFilters(filters)).toBe(4);
  });

  it("counts only the requested groups", () => {
    expect(countActiveFilters(filters, ["cities", "month", "price"])).toBe(3);
  });
});

import { describe, expect, it } from "vitest";
import {
  DEFAULT_PERIOD,
  dashboardFiltersSchema,
  toDashboardSearchParams,
  toggleCategory,
} from "./dashboard-filters.schema";

const parse = (raw: Record<string, unknown>) => dashboardFiltersSchema.parse(raw);

describe("dashboardFiltersSchema", () => {
  it("applies defaults when no params are given", () => {
    expect(DEFAULT_PERIOD).toBe(30);
    expect(parse({})).toEqual({
      period: 30,
      category: undefined,
      city: undefined,
    });
  });

  it("accepts the allowed periods", () => {
    expect(parse({ period: "7" }).period).toBe(7);
    expect(parse({ period: "90" }).period).toBe(90);
  });

  it.each(["15", "abc", "", "-7", "7.5", "0x1E", "007x"])(
    "falls back to default for invalid period %j",
    (value) => {
      expect(parse({ period: value }).period).toBe(30);
    },
  );

  it("falls back to defaults for repeated params", () => {
    expect(
      parse({ period: ["7", "90"], category: ["music", "arts"], city: ["Lima", "Cusco"] }),
    ).toEqual({ period: 30, category: undefined, city: undefined });
  });

  it("accepts well-formed category slugs", () => {
    expect(parse({ category: "stand-up-comedy" }).category).toBe("stand-up-comedy");
  });

  it.each(["Music", "a--b", "-a", "a-", "a b", "", "a".repeat(61)])(
    "drops malformed category slug %j",
    (value) => {
      expect(parse({ category: value }).category).toBeUndefined();
    },
  );

  it("trims city and drops empty or too long values", () => {
    expect(parse({ city: "  Lima  " }).city).toBe("Lima");
    expect(parse({ city: "   " }).city).toBeUndefined();
    expect(parse({ city: "x".repeat(81) }).city).toBeUndefined();
    expect(parse({ city: "x".repeat(80) }).city).toBe("x".repeat(80));
  });

  it("never throws on non-string values", () => {
    expect(() => parse({ period: 7, category: 1, city: {} })).not.toThrow();
    expect(parse({ period: 7 }).period).toBe(30);
  });
});

describe("toDashboardSearchParams", () => {
  it("omits default values", () => {
    expect(toDashboardSearchParams({ period: 30 }).toString()).toBe("");
  });

  it("serializes non-default values", () => {
    const params = toDashboardSearchParams({ period: 7, category: "music", city: "Lima" });
    expect(params.get("period")).toBe("7");
    expect(params.get("category")).toBe("music");
    expect(params.get("city")).toBe("Lima");
  });

  it("round-trips through the schema", () => {
    const filters = { period: 90 as const, category: "stand-up", city: "San Isidro" };
    const params = toDashboardSearchParams(filters);
    expect(parse(Object.fromEntries(params))).toEqual(filters);
  });

  it("round-trips defaults", () => {
    const parsed = parse(Object.fromEntries(toDashboardSearchParams({ period: 30 })));
    expect(parsed.period).toBe(30);
    expect(parsed.category).toBeUndefined();
  });
});

describe("toggleCategory", () => {
  it("activates a category keeping other filters", () => {
    expect(toggleCategory({ period: 7, city: "Lima" }, "music")).toEqual({
      period: 7,
      city: "Lima",
      category: "music",
    });
  });

  it("deactivates the same category", () => {
    const result = toggleCategory({ period: 7, category: "music" }, "music");
    expect(result).toEqual({ period: 7 });
    expect("category" in result).toBe(false);
  });

  it("switches to another category", () => {
    expect(toggleCategory({ period: 30, category: "music" }, "arts").category).toBe("arts");
  });
});

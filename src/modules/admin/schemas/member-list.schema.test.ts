import { describe, expect, it } from "vitest";

import {
  PAGE_SIZE,
  pageCount,
  userListQuerySchema,
} from "@/modules/admin/schemas/member-list.schema";

const parse = (input: Record<string, unknown>) => userListQuerySchema.parse(input);

describe("userListQuerySchema", () => {
  it("defaults page to 1 and leaves the rest undefined", () => {
    expect(parse({})).toEqual({
      page: 1,
      q: undefined,
      role: undefined,
      org: undefined,
      status: undefined,
    });
  });

  it("parses valid values", () => {
    expect(parse({ page: "3", q: "ana", role: "admin", org: "org_1", status: "pending" })).toEqual({
      page: 3,
      q: "ana",
      role: "admin",
      org: "org_1",
      status: "pending",
    });
  });

  it("falls back to page 1 for invalid pages", () => {
    for (const page of ["abc", "0", "-2", "1.5", "", "1e3"]) {
      expect(parse({ page }).page).toBe(1);
    }
  });

  it("drops blank roles and status outside the allowed values", () => {
    const result = parse({ role: "  ", status: "banned" });
    expect(result.role).toBeUndefined();
    expect(result.status).toBeUndefined();
    expect(parse({ role: " gate-staff " }).role).toBe("gate-staff");
  });

  it("trims q, caps it at 80 chars and drops blanks", () => {
    expect(parse({ q: "  ana  " }).q).toBe("ana");
    expect(parse({ q: "a".repeat(100) }).q).toHaveLength(80);
    expect(parse({ q: "   " }).q).toBeUndefined();
  });

  it("drops empty org", () => {
    expect(parse({ org: "" }).org).toBeUndefined();
  });

  it("takes the first value of array params", () => {
    expect(parse({ page: ["2", "5"], role: ["organizer", "admin"] })).toMatchObject({
      page: 2,
      role: "organizer",
    });
  });

  it("never throws on odd values", () => {
    expect(() => parse({ page: {}, q: 5, role: null, org: [], status: [[]] })).not.toThrow();
  });
});

describe("pageCount", () => {
  it("has a minimum of 1", () => {
    expect(pageCount(0)).toBe(1);
  });

  it("rounds up using PAGE_SIZE by default", () => {
    expect(PAGE_SIZE).toBe(10);
    expect(pageCount(10)).toBe(1);
    expect(pageCount(11)).toBe(2);
  });

  it("accepts a custom page size", () => {
    expect(pageCount(25, 5)).toBe(5);
  });
});

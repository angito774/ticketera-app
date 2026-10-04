import { describe, expect, it } from "vitest";

import {
  organizationListQuerySchema,
  organizationSchema,
  organizationUpdateSchema,
} from "@/modules/admin/schemas/organization.schema";

describe("organizationSchema", () => {
  it("accepts a valid organization and trims the name", () => {
    expect(organizationSchema.parse({ name: "  Teatro Municipal ", slug: "teatro-municipal" })).toEqual({
      name: "Teatro Municipal",
      slug: "teatro-municipal",
    });
  });

  it("rejects names outside 2-80 characters", () => {
    expect(organizationSchema.safeParse({ name: " a ", slug: "ab" }).success).toBe(false);
    expect(organizationSchema.safeParse({ name: "a".repeat(81), slug: "ab" }).success).toBe(false);
    expect(organizationSchema.safeParse({ name: "a".repeat(80), slug: "ab" }).success).toBe(true);
  });

  it("rejects malformed slugs", () => {
    for (const slug of ["a", "Ab", "-ab", "ab-", "a--b", "a b", "ñu", "a_b", ""]) {
      expect(organizationSchema.safeParse({ name: "Ok", slug }).success).toBe(false);
    }
  });

  it("accepts well-formed slugs up to 60 characters", () => {
    for (const slug of ["ab", "a-b", "a1-b2-c3"]) {
      expect(organizationSchema.safeParse({ name: "Ok", slug }).success).toBe(true);
    }
    expect(organizationSchema.safeParse({ name: "Ok", slug: "a".repeat(60) }).success).toBe(true);
    expect(organizationSchema.safeParse({ name: "Ok", slug: "a".repeat(61) }).success).toBe(false);
  });

  it("reports errors per field in Spanish", () => {
    const result = organizationSchema.safeParse({ name: "a", slug: "A" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.name?.[0]).toBe("Mínimo 2 caracteres");
      expect(fields.slug?.length).toBeGreaterThan(0);
    }
  });
});

describe("organizationUpdateSchema", () => {
  it("requires a non-empty id", () => {
    expect(organizationUpdateSchema.safeParse({ id: "", name: "Ok", slug: "ok" }).success).toBe(false);
    expect(organizationUpdateSchema.safeParse({ name: "Ok", slug: "ok" }).success).toBe(false);
    expect(organizationUpdateSchema.parse({ id: "org_1", name: "Ok", slug: "ok" })).toEqual({
      id: "org_1",
      name: "Ok",
      slug: "ok",
    });
  });
});

describe("organizationListQuerySchema", () => {
  const parse = (input: Record<string, unknown>) => organizationListQuerySchema.parse(input);

  it("defaults page to 1 and q to undefined", () => {
    expect(parse({})).toEqual({ page: 1, q: undefined });
  });

  it("parses valid values", () => {
    expect(parse({ page: "3", q: "teatro" })).toEqual({ page: 3, q: "teatro" });
  });

  it("falls back to page 1 for invalid pages", () => {
    for (const page of ["abc", "0", "-2", "1.5", "", "1e3"]) {
      expect(parse({ page }).page).toBe(1);
    }
  });

  it("trims q, caps it at 80 chars and drops blanks", () => {
    expect(parse({ q: "  ana  " }).q).toBe("ana");
    expect(parse({ q: "a".repeat(100) }).q).toHaveLength(80);
    expect(parse({ q: "   " }).q).toBeUndefined();
  });

  it("takes the first value of array params", () => {
    expect(parse({ page: ["2", "5"], q: ["x", "y"] })).toEqual({ page: 2, q: "x" });
  });

  it("never throws on odd values", () => {
    expect(() => parse({ page: {}, q: 5 })).not.toThrow();
  });
});

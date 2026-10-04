import { describe, expect, it } from "vitest";

import {
  isCheckViolation,
  isDivisionByZero,
  isForeignKeyViolation,
  isUniqueViolation,
} from "@/lib/pg-errors";

describe("isUniqueViolation", () => {
  it("detects code 23505 on the error or its cause", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation(new Error("x", { cause: { code: "23505" } }))).toBe(true);
  });

  it("ignores other errors", () => {
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation(new Error("x"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});

describe("isForeignKeyViolation", () => {
  it("detects code 23503 on the error or its cause", () => {
    expect(isForeignKeyViolation({ code: "23503" })).toBe(true);
    expect(isForeignKeyViolation(new Error("x", { cause: { code: "23503" } }))).toBe(true);
    expect(isForeignKeyViolation({ code: "23505" })).toBe(false);
  });
});

describe.each([
  ["isDivisionByZero", isDivisionByZero, "22012"],
  ["isCheckViolation", isCheckViolation, "23514"],
])("%s", (_name, check, code) => {
  it(`detects code ${code} on the error or nested causes`, () => {
    expect(check({ code })).toBe(true);
    expect(check(new Error("x", { cause: { code } }))).toBe(true);
    expect(check({ cause: { cause: { code } } })).toBe(true);
  });

  it("ignores other codes and non-object values", () => {
    expect(check({ code: "23505" })).toBe(false);
    expect(check(new Error("x"))).toBe(false);
    expect(check(null)).toBe(false);
    expect(check(undefined)).toBe(false);
    expect(check("boom")).toBe(false);
    expect(check(Number(code))).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { isForeignKeyViolation, isUniqueViolation } from "@/lib/pg-errors";

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

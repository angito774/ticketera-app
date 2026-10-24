import { describe, expect, it } from "vitest";

import { redactInput } from "./redact-input";

describe("redactInput", () => {
  it("redacts every sensitive key", () => {
    const result = redactInput({
      password: "a",
      temporaryPassword: "b",
      token: "c",
      secret: "d",
      clientSecret: "e",
      authorization: "f",
      name: "visible",
    });
    expect(result).toEqual({
      password: "[REDACTED]",
      temporaryPassword: "[REDACTED]",
      token: "[REDACTED]",
      secret: "[REDACTED]",
      clientSecret: "[REDACTED]",
      authorization: "[REDACTED]",
      name: "visible",
    });
  });

  it("matches keys case-insensitively", () => {
    expect(
      redactInput({ PASSWORD: "a", Authorization: "b", CLIENTSECRET: "c" }),
    ).toEqual({
      PASSWORD: "[REDACTED]",
      Authorization: "[REDACTED]",
      CLIENTSECRET: "[REDACTED]",
    });
  });

  it("redacts nested keys, including inside arrays", () => {
    const result = redactInput({
      user: { profile: { token: "x", email: "a@b.c" } },
      list: [{ secret: "y" }, { ok: 1 }],
    });
    expect(result).toEqual({
      user: { profile: { token: "[REDACTED]", email: "a@b.c" } },
      list: [{ secret: "[REDACTED]" }, { ok: 1 }],
    });
  });

  it("redacts sensitive keys even when the value is an object", () => {
    expect(redactInput({ token: { a: 1 } })).toEqual({ token: "[REDACTED]" });
  });

  it("does not mutate the original", () => {
    const original = { password: "a", nested: { token: "b" }, long: "x".repeat(600) };
    const snapshot = structuredClone(original);
    redactInput(original);
    expect(original).toEqual(snapshot);
  });

  it("truncates strings longer than 500 characters", () => {
    const result = redactInput({ text: "a".repeat(501), ok: "b".repeat(500) }) as {
      text: string;
      ok: string;
    };
    expect(result.text.startsWith("a".repeat(500))).toBe(true);
    expect(result.text.length).toBeLessThan(520);
    expect(result.text).not.toBe("a".repeat(501));
    expect(result.ok).toBe("b".repeat(500));
  });

  it("truncates top-level strings", () => {
    const result = redactInput("z".repeat(900)) as string;
    expect(result.startsWith("z".repeat(500))).toBe(true);
    expect(result.length).toBeLessThan(520);
  });

  it("tolerates undefined", () => {
    expect(redactInput(undefined)).toBeNull();
    expect(redactInput({ a: undefined, b: 1 })).toEqual({ b: 1 });
    expect(redactInput([undefined])).toEqual([null]);
  });

  it("tolerates circular references", () => {
    const a: Record<string, unknown> = { name: "a", password: "p" };
    a.self = a;
    const result = redactInput(a);
    expect(result).toEqual({
      name: "a",
      password: "[REDACTED]",
      self: "[Circular]",
    });
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it("does not flag repeated (non-circular) references as circular", () => {
    const shared = { v: 1 };
    expect(redactInput({ a: shared, b: shared })).toEqual({
      a: { v: 1 },
      b: { v: 1 },
    });
  });

  it("handles non-serializable values and returns JSON-serializable output", () => {
    const input = {
      big: BigInt(10),
      fn: () => 1,
      sym: Symbol("s"),
      date: new Date("2026-01-02T03:04:05.000Z"),
      nan: NaN,
      err: new Error("boom"),
      getter: Object.defineProperty({}, "x", {
        enumerable: true,
        get() {
          throw new Error("no");
        },
      }),
    };
    const result = redactInput(input);
    expect(result).toEqual({
      big: "10",
      fn: "[Unserializable]",
      sym: "[Unserializable]",
      date: "2026-01-02T03:04:05.000Z",
      nan: null,
      err: { name: "Error", message: "boom" },
      getter: { x: "[Unserializable]" },
    });
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it("passes through primitives and null", () => {
    expect(redactInput(null)).toBeNull();
    expect(redactInput(5)).toBe(5);
    expect(redactInput(true)).toBe(true);
  });
});

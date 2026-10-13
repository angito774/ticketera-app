import { describe, expect, it } from "vitest";
import { computeApplicationFee, computePayout, parseFeeConfig } from "./application-fee";

describe("computeApplicationFee", () => {
  it("applies percentage in bps", () => {
    expect(computeApplicationFee(10_000, { percentBps: 1000, fixedCents: 0 })).toBe(1000);
  });

  it("rounds to the nearest cent", () => {
    expect(computeApplicationFee(1005, { percentBps: 1000, fixedCents: 0 })).toBe(101);
    expect(computeApplicationFee(1004, { percentBps: 1000, fixedCents: 0 })).toBe(100);
  });

  it("adds the fixed amount", () => {
    expect(computeApplicationFee(10_000, { percentBps: 500, fixedCents: 30 })).toBe(530);
  });

  it("never exceeds the amount", () => {
    expect(computeApplicationFee(100, { percentBps: 500, fixedCents: 300 })).toBe(100);
    expect(computeApplicationFee(0, { percentBps: 1000, fixedCents: 50 })).toBe(0);
    expect(computeApplicationFee(500, { percentBps: 10_000, fixedCents: 0 })).toBe(500);
  });

  it("returns zero with a zero config", () => {
    expect(computeApplicationFee(5000, { percentBps: 0, fixedCents: 0 })).toBe(0);
  });

  it("throws on invalid config", () => {
    expect(() => computeApplicationFee(100, { percentBps: 1.5, fixedCents: 0 })).toThrow();
    expect(() => computeApplicationFee(100, { percentBps: -1, fixedCents: 0 })).toThrow();
    expect(() => computeApplicationFee(100, { percentBps: 10_001, fixedCents: 0 })).toThrow();
    expect(() => computeApplicationFee(100, { percentBps: 100, fixedCents: -1 })).toThrow();
    expect(() => computeApplicationFee(100, { percentBps: 100, fixedCents: 0.5 })).toThrow();
    expect(() => computeApplicationFee(100, { percentBps: Number.NaN, fixedCents: 0 })).toThrow();
  });

  it("throws on an invalid amount", () => {
    const config = { percentBps: 100, fixedCents: 0 };
    expect(() => computeApplicationFee(-1, config)).toThrow();
    expect(() => computeApplicationFee(1.5, config)).toThrow();
  });
});

describe("parseFeeConfig", () => {
  it("reads both variables", () => {
    expect(parseFeeConfig({ PLATFORM_FEE_BPS: "1000", PLATFORM_FEE_FIXED_CENTS: "0" })).toEqual({
      percentBps: 1000,
      fixedCents: 0,
    });
  });

  it("fails when a variable is missing or empty", () => {
    expect(() => parseFeeConfig({ PLATFORM_FEE_FIXED_CENTS: "0" })).toThrow(/PLATFORM_FEE_BPS/);
    expect(() => parseFeeConfig({ PLATFORM_FEE_BPS: "1000" })).toThrow(/PLATFORM_FEE_FIXED_CENTS/);
    expect(() => parseFeeConfig({ PLATFORM_FEE_BPS: " ", PLATFORM_FEE_FIXED_CENTS: "0" })).toThrow();
  });

  it("fails on non-integer or out-of-range values", () => {
    expect(() => parseFeeConfig({ PLATFORM_FEE_BPS: "10.5", PLATFORM_FEE_FIXED_CENTS: "0" })).toThrow();
    expect(() => parseFeeConfig({ PLATFORM_FEE_BPS: "-1", PLATFORM_FEE_FIXED_CENTS: "0" })).toThrow();
    expect(() => parseFeeConfig({ PLATFORM_FEE_BPS: "abc", PLATFORM_FEE_FIXED_CENTS: "0" })).toThrow();
    expect(() => parseFeeConfig({ PLATFORM_FEE_BPS: "10001", PLATFORM_FEE_FIXED_CENTS: "0" })).toThrow();
  });
});

describe("computePayout", () => {
  it("subtracts the fee", () => {
    expect(computePayout(10_000, 1000)).toBe(9000);
  });

  it("is never negative", () => {
    expect(computePayout(100, 500)).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import {
  isEventSettleable,
  parseSettlementDelayHours,
  summarizeSettlement,
  toFailureCode,
  type SettleabilityInput,
} from "./settlement.mapping";

const now = new Date("2026-10-09T12:00:00.000Z");
const hours = (n: number) => new Date(now.getTime() + n * 3_600_000);

const base: SettleabilityInput = {
  eventStatus: "published",
  startsAt: hours(-1),
  now,
  delayHours: 0,
  connectStatus: "active",
  hasAccount: true,
  existingSettlement: "none",
  unsettledPaidOrders: 3,
};

describe("isEventSettleable", () => {
  it("accepts an eligible event", () => {
    expect(isEventSettleable(base)).toEqual({ ok: true });
  });

  it("accepts when the delay has exactly elapsed", () => {
    expect(isEventSettleable({ ...base, startsAt: hours(-24), delayHours: 24 })).toEqual({ ok: true });
  });

  it.each([
    ["cancelled event", { eventStatus: "cancelled" as const }, /cancelado/],
    ["draft event", { eventStatus: "draft" as const }, /no está publicado/],
    ["event in the future", { startsAt: hours(2) }, /plazo/],
    ["delay not elapsed", { startsAt: hours(-1), delayHours: 2 }, /plazo/],
    ["no account", { hasAccount: false }, /no tiene cuenta/],
    ["account pending", { connectStatus: "pending" as const }, /no está activa/],
    ["account restricted", { connectStatus: "restricted" as const }, /no está activa/],
    ["already paid", { existingSettlement: "paid" as const }, /ya fue liquidado/],
    ["pending settlement", { existingSettlement: "pending" as const }, /en proceso/],
    ["failed settlement", { existingSettlement: "failed" as const }, /reintenta/],
    ["no orders", { unsettledPaidOrders: 0 }, /No hay órdenes/],
  ])("rejects: %s", (_name, override, reason) => {
    const result = isEventSettleable({ ...base, ...override });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(reason);
  });

  it("throws on an invalid delay", () => {
    expect(() => isEventSettleable({ ...base, delayHours: -1 })).toThrow();
  });
});

describe("summarizeSettlement", () => {
  const config = { percentBps: 1000, fixedCents: 0 };

  it("computes totals", () => {
    const result = summarizeSettlement(
      [
        { id: "a", totalAmount: 10_000 },
        { id: "b", totalAmount: 5000 },
      ],
      config,
    );
    expect(result.gross).toBe(15_000);
    expect(result.fee).toBe(1500);
    expect(result.payout).toBe(13_500);
    expect(result.perOrderFee).toEqual([
      { orderId: "a", fee: 1000 },
      { orderId: "b", fee: 500 },
    ]);
  });

  it("distributes the fee without losing cents", () => {
    const orders = [
      { id: "a", totalAmount: 333 },
      { id: "b", totalAmount: 333 },
      { id: "c", totalAmount: 334 },
    ];
    for (const cfg of [config, { percentBps: 333, fixedCents: 7 }, { percentBps: 10_000, fixedCents: 0 }]) {
      const result = summarizeSettlement(orders, cfg);
      expect(result.perOrderFee.reduce((s, o) => s + o.fee, 0)).toBe(result.fee);
      result.perOrderFee.forEach((o, i) => {
        expect(o.fee).toBeGreaterThanOrEqual(0);
        expect(o.fee).toBeLessThanOrEqual(orders[i].totalAmount);
      });
      expect(result.payout).toBe(result.gross - result.fee);
    }
  });

  it("handles free orders and an empty list", () => {
    const free = summarizeSettlement([{ id: "a", totalAmount: 0 }], { percentBps: 1000, fixedCents: 50 });
    expect(free).toEqual({ gross: 0, fee: 0, payout: 0, perOrderFee: [{ orderId: "a", fee: 0 }] });
    expect(summarizeSettlement([], config).perOrderFee).toEqual([]);
  });

  it("keeps the fixed fee within the order totals", () => {
    const result = summarizeSettlement(
      [
        { id: "a", totalAmount: 1 },
        { id: "b", totalAmount: 1 },
      ],
      { percentBps: 0, fixedCents: 50 },
    );
    expect(result.fee).toBe(2);
    expect(result.perOrderFee.map((o) => o.fee)).toEqual([1, 1]);
  });
});

describe("parseSettlementDelayHours", () => {
  it("reads the variable", () => {
    expect(parseSettlementDelayHours({ SETTLEMENT_DELAY_HOURS: "24" })).toBe(24);
    expect(parseSettlementDelayHours({ SETTLEMENT_DELAY_HOURS: "0" })).toBe(0);
  });

  it("fails when missing or invalid", () => {
    expect(() => parseSettlementDelayHours({})).toThrow(/SETTLEMENT_DELAY_HOURS/);
    expect(() => parseSettlementDelayHours({ SETTLEMENT_DELAY_HOURS: "-1" })).toThrow();
    expect(() => parseSettlementDelayHours({ SETTLEMENT_DELAY_HOURS: "1.5" })).toThrow();
  });
});

describe("toFailureCode", () => {
  it("prefers the error code, then the type", () => {
    expect(toFailureCode({ code: "balance_insufficient", type: "StripeInvalidRequestError" })).toBe(
      "balance_insufficient",
    );
    expect(toFailureCode({ type: "StripeConnectionError" })).toBe("StripeConnectionError");
  });

  it("sanitizes and falls back to unknown", () => {
    expect(toFailureCode(new Error("secret sk_test_123"))).toBe("unknown");
    expect(toFailureCode(null)).toBe("unknown");
    expect(toFailureCode({ code: "bad code!\n" })).toBe("badcode");
    expect(toFailureCode({ code: "x".repeat(200) })).toHaveLength(64);
  });
});

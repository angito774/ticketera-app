import { describe, expect, it } from "vitest";

import {
  assertRefundable,
  clampRefundLimit,
  REFUND_BATCH_SIZE,
  RefundRuleError,
  shouldReturnInventory,
} from "./refund.mapping";

const ok = { status: "paid", hasPaymentIntent: true, settlementId: null, redeemedTickets: 0 };

describe("assertRefundable", () => {
  it("accepts a paid, unsettled order without redeemed tickets", () => {
    expect(() => assertRefundable(ok)).not.toThrow();
  });

  it.each([
    ["already refunded", { status: "refunded" }, /ya fue reembolsada/],
    ["pending", { status: "pending" }, /pagadas/],
    ["cancelled", { status: "cancelled" }, /pagadas/],
    ["without payment intent", { hasPaymentIntent: false }, /Stripe/],
    ["settled", { settlementId: "s-1" }, /liquidada/],
    ["with redeemed tickets", { redeemedTickets: 1 }, /canjeadas/],
  ])("rejects an order %s", (_label, patch, message) => {
    const call = () => assertRefundable({ ...ok, ...patch });
    expect(call).toThrow(RefundRuleError);
    expect(call).toThrow(message);
  });
});

describe("shouldReturnInventory", () => {
  it("returns inventory only for published events", () => {
    expect(shouldReturnInventory("published")).toBe(true);
    expect(shouldReturnInventory("cancelled")).toBe(false);
    expect(shouldReturnInventory("draft")).toBe(false);
  });
});

describe("clampRefundLimit", () => {
  it("defaults and clamps to the batch size", () => {
    expect(clampRefundLimit()).toBe(REFUND_BATCH_SIZE);
    expect(clampRefundLimit(1000)).toBe(REFUND_BATCH_SIZE);
    expect(clampRefundLimit(0)).toBe(1);
    expect(clampRefundLimit(3.9)).toBe(3);
    expect(clampRefundLimit(Number.NaN)).toBe(REFUND_BATCH_SIZE);
  });
});

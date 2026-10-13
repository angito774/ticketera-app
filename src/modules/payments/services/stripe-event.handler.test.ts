import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

import { handleStripeEvent, type StripeEventDeps } from "./stripe-event.handler";

const ORDER_ID = "6f1c1f0e-5b1e-4f0e-9a52-3f0a4f1d2c11";

function makeEvent(
  type: string,
  session: Partial<Stripe.Checkout.Session> = {},
): Stripe.Event {
  return {
    id: "evt_1",
    type,
    data: {
      object: {
        id: "cs_1",
        payment_status: "paid",
        amount_total: 5000,
        currency: "pen",
        payment_intent: "pi_1",
        metadata: { orderId: ORDER_ID },
        ...session,
      },
    },
  } as unknown as Stripe.Event;
}

function makeDeps(overrides: Partial<StripeEventDeps> = {}): StripeEventDeps {
  return {
    getOrder: vi.fn().mockResolvedValue({
      stripeCheckoutSessionId: "cs_1",
      totalAmount: 5000,
      status: "pending",
      stripePaymentIntentId: null,
    }),
    recordUnknownEvent: vi.fn().mockResolvedValue(undefined),
    finalizePaidOrder: vi.fn().mockResolvedValue("paid"),
    releaseOrder: vi.fn().mockResolvedValue("released"),
    refundPayment: vi.fn().mockResolvedValue(undefined),
    logError: vi.fn(),
    ...overrides,
  };
}

describe("handleStripeEvent", () => {
  it("finalizes a payable paid session", async () => {
    const deps = makeDeps();
    await handleStripeEvent(makeEvent("checkout.session.completed"), deps);
    expect(deps.finalizePaidOrder).toHaveBeenCalledWith({
      orderId: ORDER_ID,
      paymentIntentId: "pi_1",
      stripeEventId: "evt_1",
    });
    expect(deps.refundPayment).not.toHaveBeenCalled();
    expect(deps.releaseOrder).not.toHaveBeenCalled();
  });

  it("does nothing for duplicate deliveries without refunding", async () => {
    const deps = makeDeps({ finalizePaidOrder: vi.fn().mockResolvedValue("duplicate") });
    await handleStripeEvent(makeEvent("checkout.session.completed"), deps);
    expect(deps.refundPayment).not.toHaveBeenCalled();
    expect(deps.releaseOrder).not.toHaveBeenCalled();
  });

  it("ignores sessions that are not paid", async () => {
    const deps = makeDeps();
    await handleStripeEvent(
      makeEvent("checkout.session.completed", { payment_status: "unpaid" }),
      deps,
    );
    expect(deps.getOrder).not.toHaveBeenCalled();
    expect(deps.finalizePaidOrder).not.toHaveBeenCalled();
  });

  it("releases and refunds a late payment", async () => {
    const deps = makeDeps({
      getOrder: vi.fn().mockResolvedValue({
        stripeCheckoutSessionId: "cs_1",
        totalAmount: 5000,
        status: "cancelled",
        stripePaymentIntentId: null,
      }),
    });
    await handleStripeEvent(makeEvent("checkout.session.completed"), deps);
    expect(deps.finalizePaidOrder).not.toHaveBeenCalled();
    expect(deps.releaseOrder).toHaveBeenCalledWith(ORDER_ID, "late_payment", {
      stripeEventId: "evt_1",
    });
    expect(deps.refundPayment).toHaveBeenCalledWith({
      paymentIntentId: "pi_1",
      idempotencyKey: "late-cs_1",
    });
  });

  it("releases and refunds when the amount does not match", async () => {
    const deps = makeDeps();
    await handleStripeEvent(makeEvent("checkout.session.completed", { amount_total: 100 }), deps);
    expect(deps.finalizePaidOrder).not.toHaveBeenCalled();
    expect(deps.releaseOrder).toHaveBeenCalledWith(ORDER_ID, "late_payment", {
      stripeEventId: "evt_1",
    });
    expect(deps.refundPayment).toHaveBeenCalledTimes(1);
  });

  it("refunds when the order stopped being pending during finalization", async () => {
    const deps = makeDeps({ finalizePaidOrder: vi.fn().mockResolvedValue("not_pending") });
    await handleStripeEvent(makeEvent("checkout.session.completed"), deps);
    expect(deps.refundPayment).toHaveBeenCalledTimes(1);
  });

  it("propagates refund failures so Stripe retries", async () => {
    const deps = makeDeps({ refundPayment: vi.fn().mockRejectedValue(new Error("boom")) });
    await expect(
      handleStripeEvent(makeEvent("checkout.session.completed", { amount_total: 1 }), deps),
    ).rejects.toThrow("boom");
  });

  it("logs and skips when metadata is invalid", async () => {
    const deps = makeDeps();
    await handleStripeEvent(makeEvent("checkout.session.completed", { metadata: {} }), deps);
    expect(deps.logError).toHaveBeenCalled();
    expect(deps.finalizePaidOrder).not.toHaveBeenCalled();
  });

  it("releases the order on session expiry", async () => {
    const deps = makeDeps();
    await handleStripeEvent(makeEvent("checkout.session.expired"), deps);
    expect(deps.releaseOrder).toHaveBeenCalledWith(ORDER_ID, "expired", { stripeEventId: "evt_1" });
  });

  it("does not release or refund a redelivery for an already paid order", async () => {
    const deps = makeDeps({
      getOrder: vi.fn().mockResolvedValue({
        stripeCheckoutSessionId: "cs_1",
        totalAmount: 5000,
        status: "paid",
        stripePaymentIntentId: "pi_1",
      }),
    });
    await handleStripeEvent(makeEvent("checkout.session.completed"), deps);
    expect(deps.refundPayment).not.toHaveBeenCalled();
    expect(deps.releaseOrder).not.toHaveBeenCalled();
    expect(deps.finalizePaidOrder).not.toHaveBeenCalled();
  });

  it("refunds a payment for a cancelled order", async () => {
    const deps = makeDeps({
      getOrder: vi.fn().mockResolvedValue({
        stripeCheckoutSessionId: "cs_1",
        totalAmount: 5000,
        status: "cancelled",
        stripePaymentIntentId: null,
      }),
    });
    await handleStripeEvent(makeEvent("checkout.session.completed"), deps);
    expect(deps.refundPayment).toHaveBeenCalledTimes(1);
  });

  it("retries the refund with the same key after a failed refund", async () => {
    const refundPayment = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined);
    const deps = makeDeps({
      getOrder: vi.fn().mockResolvedValue({
        stripeCheckoutSessionId: "cs_1",
        totalAmount: 5000,
        status: "cancelled",
        stripePaymentIntentId: null,
      }),
      releaseOrder: vi.fn().mockResolvedValueOnce("released").mockResolvedValueOnce("noop"),
      refundPayment,
    });
    await expect(handleStripeEvent(makeEvent("checkout.session.completed"), deps)).rejects.toThrow(
      "boom",
    );
    await handleStripeEvent(makeEvent("checkout.session.completed"), deps);
    expect(refundPayment).toHaveBeenCalledTimes(2);
    expect(refundPayment).toHaveBeenNthCalledWith(1, {
      paymentIntentId: "pi_1",
      idempotencyKey: "late-cs_1",
    });
    expect(refundPayment).toHaveBeenNthCalledWith(2, {
      paymentIntentId: "pi_1",
      idempotencyKey: "late-cs_1",
    });
  });

  it("records unknown event types and does nothing else", async () => {
    const deps = makeDeps();
    await handleStripeEvent(makeEvent("charge.succeeded"), deps);
    expect(deps.recordUnknownEvent).toHaveBeenCalledWith({ id: "evt_1", type: "charge.succeeded" });
    expect(deps.getOrder).not.toHaveBeenCalled();
    expect(deps.releaseOrder).not.toHaveBeenCalled();
    expect(deps.finalizePaidOrder).not.toHaveBeenCalled();
  });
});

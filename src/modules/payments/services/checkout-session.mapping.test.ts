import { describe, expect, it } from "vitest";
import {
  buildCheckoutSessionParams,
  isSessionPayable,
  type CheckoutSessionInput,
} from "./checkout-session.mapping";

const now = new Date("2026-10-09T12:00:00.000Z");
const minutes = (n: number) => new Date(now.getTime() + n * 60_000);

const input: CheckoutSessionInput = {
  orderId: "0f8fad5b-d9cb-469f-a165-70867728950e",
  eventId: "evt-1",
  eventSlug: "rock-fest",
  eventTitle: "Rock Fest",
  buyerEmail: "buyer@example.com",
  appUrl: "http://localhost:3000",
  expiresAt: minutes(30),
  items: [
    { zoneName: "VIP", unitPriceCents: 15000, quantity: 2 },
    { zoneName: "General", unitPriceCents: 5000, quantity: 1 },
  ],
};

describe("buildCheckoutSessionParams", () => {
  it("maps the session parameters", () => {
    const p = buildCheckoutSessionParams(input, now);
    expect(p.mode).toBe("payment");
    expect(p.currency).toBe("pen");
    expect(p.allowed_payment_method_types).toEqual(["card"]);
    expect(p.client_reference_id).toBe(input.orderId);
    expect(p.metadata).toEqual({ orderId: input.orderId });
    expect(p.customer_email).toBe("buyer@example.com");
    expect(p.expires_at).toBe(Math.floor(input.expiresAt.getTime() / 1000));
    expect(p.payment_intent_data).toEqual({
      transfer_group: "event_evt-1",
      metadata: { orderId: input.orderId },
    });
    expect(p.success_url).toBe(
      `http://localhost:3000/events/rock-fest/confirmation?order=${input.orderId}`,
    );
    expect(p.cancel_url).toBe("http://localhost:3000/events/rock-fest/checkout");
  });

  it("creates one line item per zone with the unit amount in cents", () => {
    const p = buildCheckoutSessionParams(input, now);
    expect(p.line_items).toHaveLength(2);
    expect(p.line_items?.[0]).toMatchObject({
      quantity: 2,
      price_data: { currency: "pen", unit_amount: 15000 },
    });
    expect(p.line_items?.[1]).toMatchObject({ quantity: 1, price_data: { unit_amount: 5000 } });
  });

  it("tolerates a trailing slash in appUrl", () => {
    const p = buildCheckoutSessionParams({ ...input, appUrl: "http://localhost:3000/" }, now);
    expect(p.cancel_url).toBe("http://localhost:3000/events/rock-fest/checkout");
  });

  it("rejects a total of 0", () => {
    expect(() =>
      buildCheckoutSessionParams(
        { ...input, items: [{ zoneName: "Free", unitPriceCents: 0, quantity: 2 }] },
        now,
      ),
    ).toThrow();
    expect(() => buildCheckoutSessionParams({ ...input, items: [] }, now)).toThrow();
  });

  it("enforces the 30 minutes to 24 hours expiry window", () => {
    expect(() => buildCheckoutSessionParams({ ...input, expiresAt: minutes(29) }, now)).toThrow();
    expect(() => buildCheckoutSessionParams({ ...input, expiresAt: minutes(30) }, now)).not.toThrow();
    expect(() =>
      buildCheckoutSessionParams({ ...input, expiresAt: minutes(24 * 60) }, now),
    ).not.toThrow();
    expect(() =>
      buildCheckoutSessionParams({ ...input, expiresAt: minutes(24 * 60 + 1) }, now),
    ).toThrow();
  });
});

describe("isSessionPayable", () => {
  const session = { id: "cs_1", payment_status: "paid", amount_total: 35000, currency: "pen" };
  const order = { stripeCheckoutSessionId: "cs_1", totalAmount: 35000, status: "pending" };

  it("returns ok for a matching pending order", () => {
    expect(isSessionPayable(session, order)).toBe("ok");
  });

  it("returns late when the order is no longer pending", () => {
    expect(isSessionPayable(session, { ...order, status: "cancelled" })).toBe("late");
    expect(isSessionPayable(session, { ...order, status: "paid" })).toBe("late");
  });

  it("returns mismatch for a different amount or currency", () => {
    expect(isSessionPayable({ ...session, amount_total: 100 }, order)).toBe("mismatch");
    expect(isSessionPayable({ ...session, amount_total: null }, order)).toBe("mismatch");
    expect(isSessionPayable({ ...session, currency: "usd" }, order)).toBe("mismatch");
  });

  it("returns mismatch when the session is not the order's session", () => {
    expect(isSessionPayable({ ...session, id: "cs_2" }, order)).toBe("mismatch");
    expect(isSessionPayable(session, { ...order, stripeCheckoutSessionId: null })).toBe("mismatch");
  });
});

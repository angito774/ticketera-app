import type Stripe from "stripe";

export const HOLD_TTL_MINUTES = 30;
export const HOLD_GRACE_MINUTES = 5;

const MIN_SESSION_MS = 30 * 60_000;
const MAX_SESSION_MS = 24 * 60 * 60_000;

export interface CheckoutSessionInput {
  orderId: string;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  buyerEmail: string;
  appUrl: string;
  expiresAt: Date;
  items: { zoneName: string; unitPriceCents: number; quantity: number }[];
}

export function buildCheckoutSessionParams(
  input: CheckoutSessionInput,
  now: Date = new Date(),
): Stripe.Checkout.SessionCreateParams {
  const total = input.items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);
  if (!(total > 0)) {
    throw new Error("Checkout session total must be greater than 0");
  }

  const ttl = input.expiresAt.getTime() - now.getTime();
  if (ttl < MIN_SESSION_MS || ttl > MAX_SESSION_MS) {
    throw new Error("Checkout session expiry must be between 30 minutes and 24 hours from now");
  }

  const baseUrl = input.appUrl.replace(/\/+$/, "");
  const eventUrl = `${baseUrl}/events/${input.eventSlug}`;

  return {
    mode: "payment",
    currency: "pen",
    allowed_payment_method_types: ["card"],
    line_items: input.items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: "pen",
        unit_amount: item.unitPriceCents,
        product_data: { name: `${input.eventTitle} - ${item.zoneName}` },
      },
    })),
    client_reference_id: input.orderId,
    metadata: { orderId: input.orderId },
    customer_email: input.buyerEmail,
    expires_at: Math.floor(input.expiresAt.getTime() / 1000),
    payment_intent_data: {
      transfer_group: `event_${input.eventId}`,
      metadata: { orderId: input.orderId },
    },
    success_url: `${eventUrl}/confirmation?order=${input.orderId}`,
    cancel_url: `${eventUrl}/checkout`,
  };
}

export function isSessionPayable(
  session: {
    payment_status: string;
    amount_total: number | null;
    currency: string | null;
    id: string;
  },
  order: { stripeCheckoutSessionId: string | null; totalAmount: number; status: string },
): "ok" | "late" | "mismatch" {
  if (order.stripeCheckoutSessionId !== session.id) return "mismatch";
  if (order.status !== "pending") return "late";
  if (session.amount_total !== order.totalAmount || session.currency !== "pen") return "mismatch";
  return "ok";
}

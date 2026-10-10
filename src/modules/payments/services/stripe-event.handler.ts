import type Stripe from "stripe";

import { checkoutMetadataSchema } from "@/modules/payments/schemas/checkout-metadata.schema";
import { isSessionPayable } from "@/modules/payments/services/checkout-session.mapping";

interface OrderSnapshot {
  stripeCheckoutSessionId: string | null;
  totalAmount: number;
  status: string;
  stripePaymentIntentId: string | null;
}

export interface StripeEventDeps {
  recordUnknownEvent: (event: { id: string; type: string }) => Promise<void>;
  getOrder: (orderId: string) => Promise<OrderSnapshot | null>;
  finalizePaidOrder: (args: {
    orderId: string;
    paymentIntentId: string;
    stripeEventId: string;
  }) => Promise<"paid" | "duplicate" | "not_pending">;
  releaseOrder: (
    orderId: string,
    reason: "expired" | "late_payment",
    opts: { stripeEventId: string },
  ) => Promise<"released" | "noop">;
  refundPayment: (args: { paymentIntentId: string; idempotencyKey: string }) => Promise<void>;
  logError: (message: string, context: Record<string, string | null>) => void;
}

async function defaultDeps(): Promise<StripeEventDeps> {
  const [{ db }, { orders, stripeEvents }, { eq }, reservation, { getStripe }] = await Promise.all([
    import("@/db"),
    import("@/db/schema"),
    import("drizzle-orm"),
    import("@/modules/checkout/services/reservation.service"),
    import("@/lib/stripe"),
  ]);
  return {
    recordUnknownEvent: async ({ id, type }) => {
      await db.insert(stripeEvents).values({ id, type }).onConflictDoNothing();
    },
    getOrder: async (orderId) => {
      const [order] = await db
        .select({
          stripeCheckoutSessionId: orders.stripeCheckoutSessionId,
          totalAmount: orders.totalAmount,
          status: orders.status,
          stripePaymentIntentId: orders.stripePaymentIntentId,
        })
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);
      return order ?? null;
    },
    finalizePaidOrder: reservation.finalizePaidOrder,
    releaseOrder: reservation.releaseOrder,
    refundPayment: async ({ paymentIntentId, idempotencyKey }) => {
      await getStripe().refunds.create({ payment_intent: paymentIntentId }, { idempotencyKey });
    },
    logError: (message, context) => console.error(message, context),
  };
}

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const intent = session.payment_intent;
  if (!intent) return null;
  return typeof intent === "string" ? intent : intent.id;
}

async function handleCompleted(
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
  deps: StripeEventDeps,
): Promise<void> {
  if (session.payment_status !== "paid") return;

  const metadata = checkoutMetadataSchema.safeParse(session.metadata);
  if (!metadata.success) {
    deps.logError("stripe.webhook.invalid_metadata", { eventId: event.id, sessionId: session.id });
    return;
  }
  const { orderId } = metadata.data;
  const intentId = paymentIntentId(session);

  const order = await deps.getOrder(orderId);
  if (!order) {
    deps.logError("stripe.webhook.order_not_found", { eventId: event.id, sessionId: session.id, orderId });
    return;
  }

  // Reenvío de una compra ya cobrada con este payment intent: sin efectos (nunca reembolsar).
  if (order.status === "paid" && intentId && order.stripePaymentIntentId === intentId) return;

  let verdict = isSessionPayable(session, order);
  if (verdict === "ok") {
    if (!intentId) {
      deps.logError("stripe.webhook.missing_payment_intent", {
        eventId: event.id,
        sessionId: session.id,
        orderId,
      });
      return;
    }
    const result = await deps.finalizePaidOrder({
      orderId,
      paymentIntentId: intentId,
      stripeEventId: event.id,
    });
    if (result !== "not_pending") return;
    verdict = "late";
  }

  // Liberar y reembolsar no son atómicos: si el reembolso falla se responde 500 y Stripe reenvía;
  // releaseOrder devuelve "noop" (ya liberada) y el reembolso se reintenta con la misma
  // idempotency key estable `late-<sessionId>`, por lo que no puede duplicarse.
  await deps.releaseOrder(orderId, "late_payment", { stripeEventId: event.id });
  if (!intentId) {
    deps.logError("stripe.webhook.refund_needs_manual_review", {
      eventId: event.id,
      sessionId: session.id,
      orderId,
      reason: verdict,
    });
    return;
  }
  deps.logError("stripe.webhook.refunding_unpayable_session", {
    eventId: event.id,
    sessionId: session.id,
    orderId,
    paymentIntentId: intentId,
    reason: verdict,
  });
  await deps.refundPayment({ paymentIntentId: intentId, idempotencyKey: `late-${session.id}` });
}

async function handleExpired(
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
  deps: StripeEventDeps,
): Promise<void> {
  const metadata = checkoutMetadataSchema.safeParse(session.metadata);
  if (!metadata.success) {
    deps.logError("stripe.webhook.invalid_metadata", { eventId: event.id, sessionId: session.id });
    return;
  }
  await deps.releaseOrder(metadata.data.orderId, "expired", { stripeEventId: event.id });
}

/** Errores transitorios se propagan (la ruta responde 500 y Stripe reintenta); la idempotencia la da `stripe_events`. */
export async function handleStripeEvent(event: Stripe.Event, deps?: StripeEventDeps): Promise<void> {
  const resolved = deps ?? (await defaultDeps());
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.expired") {
    await resolved.recordUnknownEvent({ id: event.id, type: event.type });
    return;
  }
  const session = event.data.object as Stripe.Checkout.Session;
  if (event.type === "checkout.session.completed") {
    await handleCompleted(event, session, resolved);
  } else {
    await handleExpired(event, session, resolved);
  }
}

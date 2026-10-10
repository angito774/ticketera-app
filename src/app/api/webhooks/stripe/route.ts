import type { NextRequest } from "next/server";

import { getStripe } from "@/lib/stripe";
import { handleStripeEvent } from "@/modules/payments/services/stripe-event.handler";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("stripe.webhook.missing_secret");
    return new Response("Webhook not configured", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Invalid signature", { status: 400 });

  const body = await req.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (error) {
    console.error("stripe.webhook.failed", {
      eventId: event.id,
      type: event.type,
      error: error instanceof Error ? error.message : "unknown",
    });
    return new Response("Webhook handler failed", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}

import type { NextRequest } from "next/server";

import { getStripe } from "@/lib/stripe";
import { handleConnectEvent } from "@/modules/payments/services/connect-event.handler";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  if (!secret) {
    console.error("stripe.connect.webhook.missing_secret");
    return new Response("Webhook not configured", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Invalid signature", { status: 400 });

  const body = await req.text();
  let notification;
  try {
    notification = getStripe().parseEventNotification(body, signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    await handleConnectEvent(notification);
  } catch (error) {
    console.error("stripe.connect.webhook.failed", {
      eventId: notification.id,
      type: notification.type,
      error: error instanceof Error ? error.message : "unknown",
    });
    return new Response("Webhook handler failed", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}

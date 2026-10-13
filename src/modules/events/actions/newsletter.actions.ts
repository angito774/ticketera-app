"use server";

import { newsletterSubscribeSchema } from "@/modules/events/schemas/newsletter.schema";
import { subscribeToNewsletter } from "@/modules/events/services/newsletter.service";

export type SubscribeActionResult = { ok: true } | { ok: false; error: string };

const SERVER_ERROR = "No pudimos completar tu suscripción. Inténtalo de nuevo más tarde.";

export async function subscribeToNewsletterAction(raw: unknown): Promise<SubscribeActionResult> {
  const parsed = newsletterSubscribeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ingresa un correo válido." };
  }
  try {
    await subscribeToNewsletter(parsed.data.email);
    return { ok: true };
  } catch (error) {
    console.error("subscribeToNewsletterAction failed", error);
    return { ok: false, error: SERVER_ERROR };
  }
}

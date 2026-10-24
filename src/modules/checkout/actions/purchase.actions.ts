"use server";

import { revalidatePath } from "next/cache";

import { safeRecord } from "@/modules/audit/services/audit.service";
import { getCurrentUser } from "@/modules/auth/services/current-user.service";
import { purchaseRequestSchema } from "@/modules/checkout/schemas/purchase.schema";
import {
  checkoutBlockReason,
  IMPERSONATION_CHECKOUT_MESSAGE,
} from "@/modules/checkout/services/checkout-guard";
import { PurchaseError, purchaseTickets } from "@/modules/checkout/services/purchase.service";

export type PurchaseActionResult =
  | { ok: true; orderId: string; checkoutUrl: string }
  | { ok: false; error: string };

/** Ids, precios y totales se resuelven en servidor; del cliente solo llegan zona/asiento/cantidad. */
export async function purchaseTicketsAction(raw: unknown): Promise<PurchaseActionResult> {
  const actor = await getCurrentUser();
  const parsed = purchaseRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  if (actor && checkoutBlockReason(actor)) {
    await safeRecord(actor, {
      action: "checkout.blocked_impersonation",
      targetType: "event",
      targetId: parsed.data.eventSlug,
      result: "denied",
      errorCode: "impersonation",
      metadata: { reason: "impersonating" },
    });
    return { ok: false, error: IMPERSONATION_CHECKOUT_MESSAGE };
  }
  try {
    const { orderId, checkoutUrl } = await purchaseTickets(actor, parsed.data);
    revalidatePath("/organizer", "layout");
    revalidatePath("/events", "layout");
    return { ok: true, orderId, checkoutUrl };
  } catch (error) {
    if (error instanceof PurchaseError) return { ok: false, error: error.message };
    throw error;
  }
}

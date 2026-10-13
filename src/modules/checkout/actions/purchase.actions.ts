"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/modules/auth/services/current-user.service";
import { purchaseRequestSchema } from "@/modules/checkout/schemas/purchase.schema";
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

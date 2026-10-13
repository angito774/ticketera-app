"use server";

import { revalidatePath } from "next/cache";
import type { ZodType } from "zod";

import { AdminError } from "@/modules/admin/services/admin.service";
import { getCurrentUser } from "@/modules/auth/services/current-user.service";
import {
  refundEventInputSchema,
  refundOrderInputSchema,
  retrySettlementInputSchema,
  settleEventInputSchema,
} from "@/modules/payments/schemas/refund.schema";
import { RefundRuleError } from "@/modules/payments/services/refund.mapping";
import {
  getRefundPreview,
  refundEventOrders,
  refundOrder,
  retryPendingRefunds,
} from "@/modules/payments/services/refund.service";
import { retrySettlement, settleEvent } from "@/modules/payments/services/settlement.service";

export type PaymentsActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

type Actor = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

const GENERIC_ERROR = "No se pudo completar la operación. Inténtalo de nuevo.";
const PAGE_PATH = "/admin/payments";

async function execute<T extends object>(
  operation: (actor: Actor) => Promise<T>,
  options: { raw: unknown; schema?: undefined } | { raw: unknown; schema: ZodType; invalid: string },
): Promise<PaymentsActionResult<T>> {
  const actor = await getCurrentUser();
  if (!actor) return { ok: false, error: "Inicia sesión para continuar" };
  if (options.schema && !options.schema.safeParse(options.raw).success) {
    return { ok: false, error: options.invalid };
  }
  try {
    const result = await operation(actor);
    revalidatePath(PAGE_PATH);
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof AdminError || error instanceof RefundRuleError) {
      return { ok: false, error: error.message };
    }
    console.error("payments admin action failed", error instanceof Error ? error.name : "unknown");
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function settleEventAction(
  raw: unknown,
): Promise<PaymentsActionResult<{ status: "paid" | "failed" | "skipped"; reason?: string }>> {
  return execute(
    async (actor) => {
      const { eventId } = settleEventInputSchema.parse(raw);
      const result = await settleEvent(actor, eventId);
      return { status: result.status, reason: result.reason };
    },
    { raw, schema: settleEventInputSchema, invalid: "Evento no encontrado" },
  );
}

export async function retrySettlementAction(
  raw: unknown,
): Promise<PaymentsActionResult<{ status: "paid" | "failed" }>> {
  return execute((actor) => retrySettlement(actor, retrySettlementInputSchema.parse(raw).settlementId), {
    raw,
    schema: retrySettlementInputSchema,
    invalid: "Liquidación no encontrada",
  });
}

export async function previewRefundAction(
  raw: unknown,
): Promise<PaymentsActionResult<{ preview: Awaited<ReturnType<typeof getRefundPreview>> }>> {
  return execute(async (actor) => ({ preview: await getRefundPreview(actor, refundOrderInputSchema.parse(raw).orderId) }), {
    raw,
    schema: refundOrderInputSchema,
    invalid: "El id de la orden no es válido",
  });
}

export async function refundOrderAction(
  raw: unknown,
): Promise<PaymentsActionResult<{ status: "refunded" | "pending_stripe" }>> {
  return execute((actor) => refundOrder(actor, refundOrderInputSchema.parse(raw).orderId), {
    raw,
    schema: refundOrderInputSchema,
    invalid: "El id de la orden no es válido",
  });
}

export async function refundEventAction(
  raw: unknown,
): Promise<PaymentsActionResult<{ processed: number; failed: number; remaining: number }>> {
  return execute((actor) => refundEventOrders(actor, refundEventInputSchema.parse(raw).eventId), {
    raw,
    schema: refundEventInputSchema,
    invalid: "Evento no encontrado",
  });
}

export async function retryPendingRefundsAction(): Promise<
  PaymentsActionResult<{ processed: number; failed: number; remaining: number }>
> {
  return execute((actor) => retryPendingRefunds(actor), { raw: undefined });
}

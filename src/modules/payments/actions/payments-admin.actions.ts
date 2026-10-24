"use server";

import { revalidatePath } from "next/cache";
import type { ZodType } from "zod";

import { AdminError } from "@/modules/admin/services/admin.service";
import { auditedAction } from "@/modules/audit/services/audit.service";
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

interface AuditOptions {
  action: string;
  targetType?: string;
  targetKey?: string;
}

type ExecuteOptions = (
  | { raw: unknown; schema?: undefined }
  | { raw: unknown; schema: ZodType; invalid: string }
) & { audit?: AuditOptions };

function readString(raw: unknown, key: string): string | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = (raw as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

async function execute<T extends object>(
  operation: (actor: Actor) => Promise<T>,
  options: ExecuteOptions,
): Promise<PaymentsActionResult<T>> {
  const actor = await getCurrentUser();
  if (!actor) return { ok: false, error: "Inicia sesión para continuar" };
  if (options.schema && !options.schema.safeParse(options.raw).success) {
    return { ok: false, error: options.invalid };
  }
  try {
    const { audit } = options;
    const result = audit
      ? await auditedAction(
          actor,
          {
            action: audit.action,
            targetType: audit.targetType,
            targetId: audit.targetKey ? readString(options.raw, audit.targetKey) : null,
            organizationId: null,
            input: options.raw,
          },
          () => operation(actor),
        )
      : await operation(actor);
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
    {
      raw,
      schema: settleEventInputSchema,
      invalid: "Evento no encontrado",
      audit: { action: "payments.settle_event", targetType: "event", targetKey: "eventId" },
    },
  );
}

export async function retrySettlementAction(
  raw: unknown,
): Promise<PaymentsActionResult<{ status: "paid" | "failed" }>> {
  return execute((actor) => retrySettlement(actor, retrySettlementInputSchema.parse(raw).settlementId), {
    raw,
    schema: retrySettlementInputSchema,
    invalid: "Liquidación no encontrada",
    audit: { action: "payments.retry_settlement", targetType: "settlement", targetKey: "settlementId" },
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
    audit: { action: "payments.refund_order", targetType: "order", targetKey: "orderId" },
  });
}

export async function refundEventAction(
  raw: unknown,
): Promise<PaymentsActionResult<{ processed: number; failed: number; remaining: number }>> {
  return execute((actor) => refundEventOrders(actor, refundEventInputSchema.parse(raw).eventId), {
    raw,
    schema: refundEventInputSchema,
    invalid: "Evento no encontrado",
    audit: { action: "payments.refund_event", targetType: "event", targetKey: "eventId" },
  });
}

export async function retryPendingRefundsAction(): Promise<
  PaymentsActionResult<{ processed: number; failed: number; remaining: number }>
> {
  return execute((actor) => retryPendingRefunds(actor), {
    raw: undefined,
    audit: { action: "payments.retry_pending_refunds" },
  });
}

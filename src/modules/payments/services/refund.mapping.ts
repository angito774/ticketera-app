export const REFUND_BATCH_SIZE = 25;

export class RefundRuleError extends Error {}

export interface RefundableOrder {
  status: string;
  hasPaymentIntent: boolean;
  settlementId: string | null;
  redeemedTickets: number;
}

/** Lanza `RefundRuleError` con un motivo legible si la orden no puede reembolsarse. */
export function assertRefundable(order: RefundableOrder): void {
  if (order.status === "refunded") throw new RefundRuleError("La orden ya fue reembolsada");
  if (order.status !== "paid") throw new RefundRuleError("Solo se reembolsan órdenes pagadas");
  if (!order.hasPaymentIntent) throw new RefundRuleError("La orden no tiene un pago registrado en Stripe");
  if (order.settlementId !== null) {
    throw new RefundRuleError("La orden ya fue liquidada al organizador; requiere reversión manual");
  }
  if (order.redeemedTickets > 0) {
    throw new RefundRuleError("La orden tiene entradas ya canjeadas");
  }
}

/** Solo un evento publicado sigue vendiendo: en uno cancelado (o borrador) el inventario no se devuelve. */
export function shouldReturnInventory(eventStatus: "draft" | "published" | "cancelled"): boolean {
  return eventStatus === "published";
}

export function clampRefundLimit(limit?: number): number {
  if (limit === undefined || !Number.isFinite(limit)) return REFUND_BATCH_SIZE;
  return Math.min(REFUND_BATCH_SIZE, Math.max(1, Math.floor(limit)));
}

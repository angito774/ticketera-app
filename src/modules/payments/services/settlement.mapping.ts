import { computeApplicationFee, computePayout, type FeeConfig } from "@/lib/application-fee";

export interface SettleabilityInput {
  eventStatus: "draft" | "published" | "cancelled";
  startsAt: Date;
  now: Date;
  delayHours: number;
  connectStatus: "not_started" | "pending" | "active" | "restricted";
  hasAccount: boolean;
  existingSettlement: "none" | "pending" | "paid" | "failed";
  unsettledPaidOrders: number;
}

const HOUR_MS = 3_600_000;
const MAX_FAILURE_CODE_LENGTH = 64;

/** Lee `SETTLEMENT_DELAY_HOURS` (entero >= 0); no hay valor por defecto. */
export function parseSettlementDelayHours(env: Record<string, string | undefined>): number {
  const raw = env.SETTLEMENT_DELAY_HOURS?.trim();
  if (!raw) throw new Error("SETTLEMENT_DELAY_HOURS is not set");
  if (!/^\d+$/.test(raw)) throw new Error("SETTLEMENT_DELAY_HOURS must be a non-negative integer");
  return Number(raw);
}

export function isEventSettleable(i: SettleabilityInput): { ok: true } | { ok: false; reason: string } {
  if (!Number.isFinite(i.delayHours) || i.delayHours < 0) {
    throw new Error("delayHours must be a non-negative number");
  }
  if (i.eventStatus === "cancelled") {
    return { ok: false, reason: "El evento está cancelado; no se liquida" };
  }
  if (i.eventStatus !== "published") {
    return { ok: false, reason: "El evento no está publicado" };
  }
  if (i.startsAt.getTime() + i.delayHours * HOUR_MS > i.now.getTime()) {
    return { ok: false, reason: "El evento aún no cumple el plazo para liquidar" };
  }
  if (!i.hasAccount) {
    return { ok: false, reason: "La organización no tiene cuenta de pagos conectada" };
  }
  if (i.connectStatus !== "active") {
    return { ok: false, reason: "La cuenta de pagos de la organización no está activa" };
  }
  if (i.existingSettlement === "paid") return { ok: false, reason: "El evento ya fue liquidado" };
  if (i.existingSettlement === "pending") {
    return { ok: false, reason: "La liquidación del evento ya está en proceso" };
  }
  if (i.existingSettlement === "failed") {
    return { ok: false, reason: "La liquidación del evento falló; reintenta desde el listado" };
  }
  if (i.unsettledPaidOrders <= 0) {
    return { ok: false, reason: "No hay órdenes pagadas pendientes de liquidar" };
  }
  return { ok: true };
}

/**
 * Comisión sobre el bruto y reparto proporcional por orden (resto por mayor fracción, desempate por
 * posición), de modo que Σ fee_i = fee sin perder centavos y fee_i <= total_i.
 */
export function summarizeSettlement(
  orders: { id: string; totalAmount: number }[],
  config: FeeConfig,
): { gross: number; fee: number; payout: number; perOrderFee: { orderId: string; fee: number }[] } {
  const gross = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const fee = computeApplicationFee(gross, config);
  const payout = computePayout(gross, fee);
  if (gross === 0) {
    return { gross, fee, payout, perOrderFee: orders.map((o) => ({ orderId: o.id, fee: 0 })) };
  }

  const bigFee = BigInt(fee);
  const bigGross = BigInt(gross);
  const shares = orders.map((o, index) => {
    const product = bigFee * BigInt(o.totalAmount);
    return { index, floor: product / bigGross, remainder: product % bigGross };
  });
  let leftover = Number(bigFee - shares.reduce((sum, s) => sum + s.floor, BigInt(0)));
  const fees = shares.map((s) => Number(s.floor));
  const byRemainder = [...shares].sort(
    (a, b) => (a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1),
  );
  for (const share of byRemainder) {
    if (leftover <= 0) break;
    fees[share.index] += 1;
    leftover -= 1;
  }

  return {
    gross,
    fee,
    payout,
    perOrderFee: orders.map((o, index) => ({ orderId: o.id, fee: fees[index] })),
  };
}

/** Código corto y seguro para `settlements.failure_code`; nunca el mensaje ni el payload del error. */
export function toFailureCode(error: unknown): string {
  const e = (typeof error === "object" && error !== null ? error : {}) as {
    code?: unknown;
    type?: unknown;
  };
  const raw = typeof e.code === "string" ? e.code : typeof e.type === "string" ? e.type : "unknown";
  const safe = raw.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, MAX_FAILURE_CODE_LENGTH);
  return safe || "unknown";
}

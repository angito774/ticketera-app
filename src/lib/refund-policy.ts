import { businessDaysBetween } from "./business-days";

export const REFUND_MAX_BUSINESS_DAYS = 15;
export const REFUND_WARNING_BUSINESS_DAYS = 10;
export const REFUND_DEADLINE_TEXT = `máximo ${REFUND_MAX_BUSINESS_DAYS} días hábiles`;

export type RefundDeadlineState = "unknown" | "on_track" | "warning" | "overdue";

export interface RefundDeadline {
  state: RefundDeadlineState;
  businessDays: number | null;
}

export function getRefundDeadline(cancelledAt: Date | null, now: Date): RefundDeadline {
  if (cancelledAt === null) return { state: "unknown", businessDays: null };
  const businessDays = businessDaysBetween(cancelledAt, now);
  if (businessDays >= REFUND_MAX_BUSINESS_DAYS) return { state: "overdue", businessDays };
  if (businessDays >= REFUND_WARNING_BUSINESS_DAYS) return { state: "warning", businessDays };
  return { state: "on_track", businessDays };
}

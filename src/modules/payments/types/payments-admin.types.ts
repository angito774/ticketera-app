import type { RefundDeadline } from "@/lib/refund-policy";

export interface CancelledEventRow {
  eventId: string;
  eventTitle: string;
  organizationName: string;
  pendingOrders: number;
  cancelledAt: Date | null;
  deadline: RefundDeadline;
}

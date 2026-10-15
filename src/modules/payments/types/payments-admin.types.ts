import type { RefundDeadline } from "@/lib/refund-policy";

export interface CancelledEventRow {
  eventId: string;
  eventTitle: string;
  organizationName: string;
  pendingOrders: number;
  cancelledAt: Date | null;
  deadline: RefundDeadline;
}

export interface PaymentRow {
  orderId: string;
  eventTitle: string;
  organizationName: string;
  buyerEmail: string;
  amount: number;
  status: "paid" | "refunded";
  settled: boolean;
  date: Date;
}

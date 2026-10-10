import { z } from "zod";

export const refundOrderInputSchema = z.object({ orderId: z.string().uuid() });
export const refundEventInputSchema = z.object({ eventId: z.string().uuid() });
export const settleEventInputSchema = z.object({ eventId: z.string().uuid() });
export const retrySettlementInputSchema = z.object({ settlementId: z.string().uuid() });

export type RefundOrderInput = z.infer<typeof refundOrderInputSchema>;
export type RefundEventInput = z.infer<typeof refundEventInputSchema>;
export type SettleEventInput = z.infer<typeof settleEventInputSchema>;
export type RetrySettlementInput = z.infer<typeof retrySettlementInputSchema>;

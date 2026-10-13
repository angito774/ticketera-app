import { z } from "zod";

export const checkoutMetadataSchema = z.object({ orderId: z.string().uuid() });

export type CheckoutMetadata = z.infer<typeof checkoutMetadataSchema>;

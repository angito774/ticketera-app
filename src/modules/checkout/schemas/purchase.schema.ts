import { z, type ZodType } from "zod";

import { PAYMENT_METHODS, type PaymentMethod } from "@/modules/checkout/schemas/checkout.schema";
import { MAX_TICKETS_PER_ZONE } from "@/modules/tickets/services/venues.service";
import type { PurchaseSelection } from "@/modules/tickets/store/purchase.store";

const MAX_KEY_LENGTH = 60;
const MAX_ZONES = 10;

export interface PurchaseRequest {
  eventSlug: string;
  selection: PurchaseSelection;
  buyer: {
    fullName: string;
    email: string;
    documentNumber?: string;
    phone?: string;
  };
  paymentMethod: PaymentMethod;
}

const zoneKey = z.string().max(MAX_KEY_LENGTH);


const selectionSchema = z
  .object({
    quantities: z.record(
      zoneKey,
      z.number().int("La cantidad debe ser un entero.").min(0).max(MAX_TICKETS_PER_ZONE)
    ),
    seats: z.record(
      zoneKey,
      z
        .array(z.string().min(1).max(MAX_KEY_LENGTH))
        .max(MAX_TICKETS_PER_ZONE)
        .refine((ids) => new Set(ids).size === ids.length, "Hay asientos repetidos.")
    ),
  })
  .superRefine(({ quantities, seats }, ctx) => {
    const zones = new Set([...Object.keys(quantities), ...Object.keys(seats)]);
    if (zones.size > MAX_ZONES) {
      ctx.addIssue({ code: "custom", message: "Demasiadas zonas." });
    }
    const total =
      Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0) +
      Object.values(seats).reduce((sum, ids) => sum + ids.length, 0);
    if (total < 1) {
      ctx.addIssue({ code: "custom", message: "Selecciona al menos una entrada." });
    }
  });

const buyerSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().pipe(z.email("Ingresa un correo válido.").max(254)),
  documentNumber: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined)
    .pipe(z.string().regex(/^[A-Za-z0-9]{6,12}$/, "Documento inválido.").optional()),
  phone: z
    .string()
    .optional()
    .transform((value) => value?.replace(/\s/g, "") || undefined)
    .pipe(z.string().regex(/^9\d{8}$/, "Celular inválido.").optional()),
});

export const purchaseRequestSchema: ZodType<PurchaseRequest> = z.object({
  eventSlug: z.string().trim().min(1).max(100),
  selection: selectionSchema,
  buyer: buyerSchema,
  paymentMethod: z.enum(PAYMENT_METHODS),
});

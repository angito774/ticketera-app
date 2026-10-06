import { z } from "zod";

export const newsletterSubscribeSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Ingresa tu correo.")
    .max(254, "Ingresa un correo válido.")
    .pipe(z.email("Ingresa un correo válido.")),
});

export type NewsletterSubscribeInput = z.infer<typeof newsletterSubscribeSchema>;

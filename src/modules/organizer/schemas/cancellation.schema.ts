import { z } from "zod";

export const CANCELLATION_REASONS = [
  "artist",
  "natural_disaster",
  "authority",
  "venue",
  "safety",
  "other",
] as const;

export type CancellationReason = (typeof CANCELLATION_REASONS)[number];

export const CANCELLATION_REASON_LABELS: Record<CancellationReason, string> = {
  artist: "Artista enfermo o no disponible",
  natural_disaster: "Desastre natural o sismo",
  authority: "Orden de una autoridad",
  venue: "Problema con el recinto",
  safety: "Riesgo para la seguridad",
  other: "Otro motivo",
};

export const CANCELLATION_NOTE_MAX = 500;

export const cancelEventInputSchema = z
  .object({
    id: z.string().uuid(),
    reason: z.enum(CANCELLATION_REASONS),
    note: z.string().trim().max(CANCELLATION_NOTE_MAX).optional(),
  })
  .refine((v) => v.reason !== "other" || (v.note?.length ?? 0) > 0, {
    path: ["note"],
    message: "Describe el motivo de la cancelación",
  });

import { z } from "zod";

export const organizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(80, "Máximo 80 caracteres"),
  slug: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(60, "Máximo 60 caracteres")
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "Solo minúsculas, números y guiones (sin guiones al inicio, final ni repetidos)",
    ),
});

export const organizationUpdateSchema = organizationSchema.extend({
  id: z.string().min(1),
});

const first = (value: unknown): unknown => (Array.isArray(value) ? value[0] : value);

const page = z.preprocess(first, z.unknown()).transform((v) => {
  const n = typeof v === "string" && /^\d+$/.test(v) ? Number(v) : NaN;
  return Number.isSafeInteger(n) && n >= 1 ? n : 1;
});

const q = z.preprocess(first, z.unknown()).transform((v) => {
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim().slice(0, 80).trim();
  return trimmed || undefined;
});

export const organizationListQuerySchema = z.object({ page, q });

export type OrganizationInput = z.infer<typeof organizationSchema>;
export type OrganizationUpdateInput = z.infer<typeof organizationUpdateSchema>;
export type OrganizationListQuery = { page: number; q?: string };

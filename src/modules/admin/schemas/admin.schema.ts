import { z } from "zod";

import { ORG_ROLES } from "@/modules/auth/services/permissions";

const roleSchema = z.enum(ORG_ROLES);

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(80),
});

export const addMemberSchema = z.object({
  organizationId: z.string().min(1),
  email: z.email("Correo inválido").transform((v) => v.toLowerCase()),
  fullName: z.string().trim().min(2, "Ingresa el nombre").max(80),
  role: roleSchema,
});

export const changeRoleSchema = z.object({
  memberId: z.string().min(1),
  role: roleSchema,
});

export const removeMemberSchema = z.object({ memberId: z.string().min(1) });

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;

/** "Teatro Municipal" → "teatro-municipal" */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

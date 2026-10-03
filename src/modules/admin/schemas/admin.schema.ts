import { z } from "zod";

const roleSchema = z.string().trim().min(1, "Selecciona un rol");

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

export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;

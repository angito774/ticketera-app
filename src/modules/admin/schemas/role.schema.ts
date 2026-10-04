import { z } from "zod";

import { ASSIGNABLE_PERMISSIONS } from "@/modules/auth/services/permissions";

type AssignablePermission = (typeof ASSIGNABLE_PERMISSIONS)[number];

export const PERMISSION_INFO: Record<
  AssignablePermission,
  { label: string; description: string }
> = {
  "members:manage": {
    label: "Gestionar usuarios",
    description: "Agregar, cambiar de rol y quitar usuarios de la organización",
  },
  "events:manage": {
    label: "Gestionar eventos",
    description: "Crear y editar eventos y entradas",
  },
  "tickets:redeem": {
    label: "Validar entradas",
    description: "Escanear y canjear entradas en la puerta",
  },
};

const name = z
  .string()
  .trim()
  .min(2, "Mínimo 2 caracteres")
  .max(40, "Máximo 40 caracteres");

const description = z
  .string()
  .trim()
  .max(200, "Máximo 200 caracteres")
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null);

const permissions = z
  .array(z.enum(ASSIGNABLE_PERMISSIONS, "Permiso no válido"))
  .min(1, "Selecciona al menos un permiso")
  .refine((list) => new Set(list).size === list.length, "Permisos duplicados");

export const roleCreateSchema = z.object({
  id: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(32, "Máximo 32 caracteres")
    .regex(
      /^[a-z][a-z0-9_-]*$/,
      "Solo minúsculas, números, guiones y guion bajo; debe empezar con una letra",
    ),
  name,
  description,
  permissions,
});

export const roleUpdateSchema = z.object({
  id: z.string().min(1),
  name,
  description,
  permissions,
});

export const roleDeleteSchema = z.object({ id: z.string().min(1) });

export function samePermissions(a: readonly string[], b: readonly string[]): boolean {
  const left = new Set(a);
  const right = new Set(b);
  return left.size === right.size && [...left].every((p) => right.has(p));
}

export function roleInUseMessage(memberCount: number): string {
  return `No se puede eliminar: lo tienen asignado ${memberCount} ${
    memberCount === 1 ? "miembro" : "miembros"
  }`;
}

export type RoleCreateInput = z.infer<typeof roleCreateSchema>;
export type RoleUpdateInput = z.infer<typeof roleUpdateSchema>;

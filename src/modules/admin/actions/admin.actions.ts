"use server";

import { revalidatePath } from "next/cache";
import type { ZodType } from "zod";

import {
  addMemberSchema,
  changeRoleSchema,
  createOrganizationSchema,
  removeMemberSchema,
} from "@/modules/admin/schemas/admin.schema";
import {
  AdminError,
  addMember,
  changeMemberRole,
  createOrganization,
  removeMember,
} from "@/modules/admin/services/admin.service";
import {
  getCurrentUser,
  type CurrentUser,
} from "@/modules/auth/services/current-user.service";

export type ActionResult =
  | { ok: true; temporaryPassword?: string | null }
  | { ok: false; error: string };

/** Valida la entrada, ejecuta el caso de uso con el usuario de la sesión y traduce errores a un resultado. */
async function run<T>(
  schema: ZodType<T>,
  raw: unknown,
  action: (actor: CurrentUser, input: T) => Promise<{ temporaryPassword?: string | null } | void>,
): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!actor) return { ok: false, error: "Inicia sesión para continuar" };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  try {
    const extra = await action(actor, parsed.data);
    revalidatePath("/admin");
    return { ok: true, ...(extra ?? {}) };
  } catch (error) {
    if (error instanceof AdminError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function createOrganizationAction(raw: unknown) {
  return run(createOrganizationSchema, raw, (actor, input) =>
    createOrganization(actor, input),
  );
}

export async function addMemberAction(raw: unknown) {
  return run(addMemberSchema, raw, (actor, input) => addMember(actor, input));
}

export async function changeMemberRoleAction(raw: unknown) {
  return run(changeRoleSchema, raw, (actor, input) =>
    changeMemberRole(actor, input.memberId, input.role),
  );
}

export async function removeMemberAction(raw: unknown) {
  return run(removeMemberSchema, raw, (actor, input) =>
    removeMember(actor, input.memberId),
  );
}

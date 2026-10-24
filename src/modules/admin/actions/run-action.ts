import { revalidatePath } from "next/cache";
import type { ZodType } from "zod";

import { auditedAction } from "@/modules/audit/services/audit.service";
import type { AuditMeta } from "@/modules/audit/types/audit.types";
import { AdminError } from "@/modules/admin/services/admin.service";
import {
  getCurrentUser,
  type CurrentUser,
} from "@/modules/auth/services/current-user.service";

export type ActionResult =
  | { ok: true; temporaryPassword?: string | null }
  | { ok: false; error: string };

export type AuditTarget = Omit<AuditMeta, "action" | "input">;

/**
 * Valida la entrada, ejecuta el caso de uso con el usuario de la sesión y traduce errores a un resultado.
 * Registra la acción en la auditoría (solo super admin) con la entrada validada; `target` deriva el objetivo.
 */
export async function run<T>(
  auditAction: string,
  schema: ZodType<T>,
  raw: unknown,
  action: (actor: CurrentUser, input: T) => Promise<{ temporaryPassword?: string | null } | void>,
  target?: (input: T) => AuditTarget,
): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!actor) return { ok: false, error: "Inicia sesión para continuar" };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  try {
    const extra = await auditedAction(
      actor,
      { action: auditAction, ...target?.(parsed.data), input: parsed.data },
      () => action(actor, parsed.data),
    );
    // "layout" invalida todo el árbol bajo /admin: refresca /admin, /admin/users y /admin/roles.
    revalidatePath("/admin", "layout");
    return { ok: true, ...(extra ?? {}) };
  } catch (error) {
    if (error instanceof AdminError) return { ok: false, error: error.message };
    throw error;
  }
}

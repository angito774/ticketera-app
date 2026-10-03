import { revalidatePath } from "next/cache";
import type { ZodType } from "zod";

import { AdminError } from "@/modules/admin/services/admin.service";
import {
  getCurrentUser,
  type CurrentUser,
} from "@/modules/auth/services/current-user.service";

export type ActionResult =
  | { ok: true; temporaryPassword?: string | null }
  | { ok: false; error: string };

/** Valida la entrada, ejecuta el caso de uso con el usuario de la sesión y traduce errores a un resultado. */
export async function run<T>(
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
    // "layout" invalida todo el árbol bajo /admin: refresca /admin, /admin/users y /admin/roles.
    revalidatePath("/admin", "layout");
    return { ok: true, ...(extra ?? {}) };
  } catch (error) {
    if (error instanceof AdminError) return { ok: false, error: error.message };
    throw error;
  }
}

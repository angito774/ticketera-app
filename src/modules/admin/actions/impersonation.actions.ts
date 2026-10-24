"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import {
  endImpersonation,
  ImpersonationError,
  startImpersonation,
} from "@/modules/admin/services/impersonation.service";
import { getCurrentUser } from "@/modules/auth/services/current-user.service";

export type ImpersonationResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

const targetUserIdSchema = z.string().min(1);

const DENIED_MESSAGE = "No puedes impersonar a este usuario";
const RETRY_MESSAGE = "No se pudo iniciar la impersonación. Inténtalo de nuevo";
const GENERIC_MESSAGE = "Ocurrió un error inesperado. Inténtalo de nuevo";

function messageFor(error: unknown): string {
  if (!(error instanceof ImpersonationError)) return GENERIC_MESSAGE;
  switch (error.reason) {
    case "audit_failed":
    case "token_failed":
      return RETRY_MESSAGE;
    default:
      return DENIED_MESSAGE;
  }
}

export async function startImpersonationAction(
  targetUserId: string,
): Promise<ImpersonationResult> {
  const parsed = targetUserIdSchema.safeParse(targetUserId);
  if (!parsed.success) return { ok: false, error: "Usuario inválido" };

  const actor = await getCurrentUser();
  if (!actor) return { ok: false, error: "Inicia sesión para continuar" };

  try {
    const { url } = await startImpersonation(actor, parsed.data);
    return { ok: true, url };
  } catch (error) {
    if (!(error instanceof ImpersonationError)) {
      console.error("[impersonation] error inesperado", error);
    }
    return { ok: false, error: messageFor(error) };
  }
}

export async function endImpersonationAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Inicia sesión para continuar" };
  if (!user.impersonatedBy) {
    return { ok: false, error: "No hay una impersonación activa" };
  }

  try {
    const { sessionId } = await auth();
    if (!sessionId) return { ok: false, error: "No hay una impersonación activa" };
    await endImpersonation(user, sessionId);
    return { ok: true };
  } catch (error) {
    console.error("[impersonation] no se pudo terminar la sesión", error);
    return { ok: false, error: GENERIC_MESSAGE };
  }
}

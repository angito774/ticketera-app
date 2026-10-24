import { db } from "@/db";
import { adminAuditLog } from "@/db/schema";
import type { CurrentUser } from "@/modules/auth/services/current-user.service";
import type { AuditEntry, AuditMeta } from "../types/audit.types";
import { redactInput } from "./redact-input";

const MAX_ERROR_CODE_LENGTH = 200;

function resolveActor(
  user: CurrentUser,
): { actorUserId: string; impersonatedUserId: string | null } | null {
  if (user.impersonatedBy) {
    return { actorUserId: user.impersonatedBy.id, impersonatedUserId: user.id };
  }
  return user.isSuperAdmin ? { actorUserId: user.id, impersonatedUserId: null } : null;
}

/**
 * Registra una acción del super admin. Bajo impersonación el actor es el super admin real
 * y se audita siempre. Devuelve el id de la fila o null si no hay actor auditable.
 */
export async function recordAudit(
  user: CurrentUser,
  entry: AuditEntry,
): Promise<string | null> {
  const actor = resolveActor(user);
  if (!actor) return null;

  const [row] = await db
    .insert(adminAuditLog)
    .values({
      ...actor,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      organizationId: entry.organizationId ?? null,
      input: entry.input === undefined ? null : redactInput(entry.input),
      result: entry.result,
      errorCode: entry.errorCode ?? null,
      metadata: entry.metadata ?? null,
    })
    .returning({ id: adminAuditLog.id });

  return row?.id ?? null;
}

function errorCodeOf(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : error.name;
  }
  return "UnknownError";
}

function domainErrorCode(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  const result = value as { ok?: unknown; code?: unknown; error?: unknown };
  if (result.ok !== false) return null;
  const code = typeof result.code === "string" ? result.code : result.error;
  return typeof code === "string"
    ? code.slice(0, MAX_ERROR_CODE_LENGTH)
    : "DomainError";
}

/** Fail-open: si el registro falla, loguea el error y no lo propaga. */
export async function safeRecord(user: CurrentUser, entry: AuditEntry): Promise<void> {
  try {
    await recordAudit(user, entry);
  } catch (error) {
    console.error(`No se pudo registrar la auditoría de "${entry.action}"`, error);
  }
}

/** Ejecuta `fn` y registra el resultado sin alterar lo que devuelve o lanza (fail-open si el registro falla). */
export async function auditedAction<T>(
  user: CurrentUser,
  meta: AuditMeta,
  fn: () => Promise<T>,
): Promise<T> {
  let value: T;
  try {
    value = await fn();
  } catch (error) {
    await safeRecord(user, { ...meta, result: "error", errorCode: errorCodeOf(error) });
    throw error;
  }
  const errorCode = domainErrorCode(value);
  await safeRecord(
    user,
    errorCode === null
      ? { ...meta, result: "ok" }
      : { ...meta, result: "error", errorCode },
  );
  return value;
}

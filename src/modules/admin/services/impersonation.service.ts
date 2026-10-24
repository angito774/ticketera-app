import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import {
  assertCanImpersonate,
  type ImpersonationDenyReason,
} from "@/modules/admin/services/impersonation-guard";
import { recordAudit, safeRecord } from "@/modules/audit/services/audit.service";
import type { AuditEntry } from "@/modules/audit/types/audit.types";
import type { CurrentUser } from "@/modules/auth/services/current-user.service";

export const ACTOR_TOKEN_TTL_SECONDS = 300;
export const IMPERSONATION_SESSION_SECONDS = 1800;

export class ImpersonationError extends Error {
  constructor(
    public reason: ImpersonationDenyReason | "audit_failed" | "token_failed",
  ) {
    super(reason);
    this.name = "ImpersonationError";
  }
}

async function loadTarget(targetUserId: string) {
  const row = await db.query.users.findFirst({
    where: eq(users.id, targetUserId),
    columns: { id: true, isSuperAdmin: true },
  });
  return row ?? null;
}

export async function startImpersonation(
  actor: CurrentUser,
  targetUserId: string,
): Promise<{ url: string }> {
  const target = await loadTarget(targetUserId);
  const verdict = assertCanImpersonate({ actor, target });

  if (!verdict.ok) {
    if (verdict.reason === "not_super_admin") {
      console.warn("[impersonation] intento de un usuario sin rol super admin", actor.id);
    }
    await safeRecord(actor, {
      action: "impersonation.denied",
      targetType: "user",
      targetId: targetUserId,
      result: "denied",
      errorCode: verdict.reason,
      metadata: { reason: verdict.reason },
    });
    throw new ImpersonationError(verdict.reason);
  }

  const expiresAt = new Date(
    Date.now() + ACTOR_TOKEN_TTL_SECONDS * 1000,
  ).toISOString();
  const entry: AuditEntry = {
    action: "impersonation.start",
    targetType: "user",
    targetId: targetUserId,
    result: "ok",
    metadata: {
      expiresAt,
      sessionMaxDurationInSeconds: IMPERSONATION_SESSION_SECONDS,
    },
  };

  try {
    await recordAudit(actor, entry);
  } catch (error) {
    console.error("[audit] impersonation.start no registrado; se cancela", error);
    throw new ImpersonationError("audit_failed");
  }

  let url: string | null | undefined;
  try {
    const token = await (await clerkClient()).actorTokens.create({
      userId: targetUserId,
      actor: { sub: actor.id },
      expiresInSeconds: ACTOR_TOKEN_TTL_SECONDS,
      sessionMaxDurationInSeconds: IMPERSONATION_SESSION_SECONDS,
    });
    url = token.url;
  } catch (error) {
    console.error("[impersonation] Clerk no creó el actor token", error);
  }

  if (!url) {
    await safeRecord(actor, {
      ...entry,
      result: "error",
      errorCode: "token_failed",
    });
    throw new ImpersonationError("token_failed");
  }
  return { url };
}

export async function endImpersonation(
  user: CurrentUser,
  sessionId: string,
): Promise<void> {
  await safeRecord(user, {
    action: "impersonation.end",
    targetType: "user",
    targetId: user.id,
    result: "ok",
  });
  await (await clerkClient()).sessions.revokeSession(sessionId);
}

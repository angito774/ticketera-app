"use server";

import { MAX_CLAIMS_PER_EMAIL_PER_DAY } from "../config/claims-provider";
import { claimSubmitSchema, type ClaimSubmitInput } from "../schemas/claim.schema";
import { countRecentClaimsByEmail, createClaim } from "../services/claims.service";
import type { SubmitClaimResult } from "../types/claim.types";

const SERVER_ERROR = "No pudimos registrar tu reclamo. Inténtalo de nuevo más tarde.";
const LIMIT_ERROR = "Ya registraste varios reclamos hoy con este correo. Inténtalo de nuevo mañana.";

function hasHoneypot(raw: unknown): boolean {
  if (typeof raw !== "object" || raw === null) return false;
  const website = (raw as { website?: unknown }).website;
  return typeof website === "string" && website.trim() !== "";
}

/**
 * DrizzleQueryError.message incluye el SQL y todos los params (datos personales),
 * así que solo se registran nombre y código del error del driver (`cause`).
 */
function describeSafely(error: unknown): { error: string; cause?: string; code?: string } {
  const name = (value: unknown) => (value instanceof Error ? value.name : typeof value);
  const cause = error instanceof Error ? error.cause : undefined;
  const code = (cause as { code?: unknown } | undefined)?.code;
  return {
    error: name(error),
    ...(cause !== undefined ? { cause: name(cause) } : {}),
    ...(typeof code === "string" && /^[\w-]{1,20}$/.test(code) ? { code } : {}),
  };
}

export async function submitClaimAction(raw: unknown): Promise<SubmitClaimResult> {
  if (hasHoneypot(raw)) return { ok: false, error: SERVER_ERROR };

  const parsed = claimSubmitSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof ClaimSubmitInput, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof ClaimSubmitInput | undefined;
      if (key && !(key in fieldErrors)) fieldErrors[key] = issue.message;
    }
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario.",
      fieldErrors,
    };
  }

  try {
    const recent = await countRecentClaimsByEmail(parsed.data.email);
    if (recent >= MAX_CLAIMS_PER_EMAIL_PER_DAY) return { ok: false, error: LIMIT_ERROR };

    const receipt = await createClaim(parsed.data);
    return { ok: true, receipt };
  } catch (error) {
    console.error("submitClaimAction failed", describeSafely(error));
    return { ok: false, error: SERVER_ERROR };
  }
}

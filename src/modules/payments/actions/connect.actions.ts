"use server";

import { AdminError } from "@/modules/admin/services/admin.service";
import { getCurrentUser } from "@/modules/auth/services/current-user.service";
import { connectOrganizationInputSchema } from "@/modules/payments/schemas/connect.schema";
import {
  createAccountSessionSecret,
  createOnboardingLink,
} from "@/modules/payments/services/connect.service";

export type ConnectActionResult<T> = ({ ok: true } & T) | { ok: false; error: string };

type Actor = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

const GENERIC_ERROR = "No se pudo completar la operación. Inténtalo de nuevo.";

async function run<T extends object>(
  raw: unknown,
  operation: (actor: Actor, organizationId: string) => Promise<T>,
): Promise<ConnectActionResult<T>> {
  const actor = await getCurrentUser();
  if (!actor) return { ok: false, error: "Inicia sesión para continuar" };
  const parsed = connectOrganizationInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Organización no encontrada" };
  try {
    return { ok: true, ...(await operation(actor, parsed.data.organizationId)) };
  } catch (error) {
    if (error instanceof AdminError) return { ok: false, error: error.message };
    console.error("connect action failed", error instanceof Error ? error.name : "unknown");
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function startOnboardingAction(
  raw: unknown,
): Promise<ConnectActionResult<{ url: string }>> {
  return run(raw, createOnboardingLink);
}

export async function createAccountSessionAction(
  raw: unknown,
): Promise<ConnectActionResult<{ clientSecret: string }>> {
  return run(raw, createAccountSessionSecret);
}

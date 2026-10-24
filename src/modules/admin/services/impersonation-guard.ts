import type { CurrentUser } from "@/modules/auth/services/current-user.service";

export type ImpersonationDenyReason =
  | "not_super_admin"
  | "self"
  | "target_super_admin"
  | "nested"
  | "target_not_found";

export interface ImpersonationTarget {
  id: string;
  isSuperAdmin: boolean;
}

/** Reglas para impersonar, evaluadas en orden; el primer motivo que aplique es el devuelto. */
export function assertCanImpersonate(input: {
  actor: CurrentUser;
  target: ImpersonationTarget | null;
}): { ok: true } | { ok: false; reason: ImpersonationDenyReason } {
  const { actor, target } = input;
  if (!actor.isSuperAdmin) return { ok: false, reason: "not_super_admin" };
  if (target && target.id === actor.id) return { ok: false, reason: "self" };
  if (target?.isSuperAdmin) return { ok: false, reason: "target_super_admin" };
  if (actor.impersonatedBy) return { ok: false, reason: "nested" };
  if (!target) return { ok: false, reason: "target_not_found" };
  return { ok: true };
}

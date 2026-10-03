import type {
  AuthSubject,
  RoleDef,
} from "@/modules/auth/services/permissions";
import { assignableRoles } from "@/modules/auth/services/permissions";

interface GuardedMember {
  userId: string;
  organizationId: string;
  roleId: string;
}

/** Devuelve el motivo por el que `actor` no puede modificar la membresía, o null si puede. */
export function memberGuardError(
  actor: AuthSubject & { id: string },
  member: GuardedMember,
  roles: RoleDef[],
): string | null {
  if (member.userId === actor.id) return "No puedes modificar tu propio rol";
  // Un admin solo gestiona organizadores; cambiar/quitar admins es del super admin.
  if (
    !assignableRoles(actor, member.organizationId, roles).some(
      (r) => r.id === member.roleId,
    )
  ) {
    return "Sin permiso sobre este miembro";
  }
  return null;
}

/** Guard de addMember: con membresía previa aplica el guard; sin ella solo bloquea al propio actor. */
export function addMemberGuardError(
  actor: AuthSubject & { id: string },
  targetUserId: string,
  existing: GuardedMember | null,
  roles: RoleDef[],
): string | null {
  if (existing) return memberGuardError(actor, existing, roles);
  return targetUserId === actor.id ? "No puedes modificar tu propio rol" : null;
}

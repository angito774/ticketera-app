/** Rol global de la persona, derivado de sus permisos. `customer` = sin permisos de gestión. */
export type AppRole = "super_admin" | "admin" | "organizer" | "customer";

export type Permission =
  | "organizations:manage"
  | "roles:manage"
  | "members:manage"
  | "events:manage"
  | "events:feature"
  | "tickets:redeem";

export const ASSIGNABLE_PERMISSIONS = [
  "members:manage",
  "events:manage",
  "tickets:redeem",
] as const;

export interface RoleDef {
  id: string;
  name: string;
  permissions: Permission[];
  isSystem: boolean;
}

export interface AuthMembership {
  organizationId: string;
  roleId: string;
  permissions: Permission[];
}

export interface AuthSubject {
  isSuperAdmin: boolean;
  memberships: AuthMembership[];
}

function isAssignable(permission: Permission): boolean {
  return (ASSIGNABLE_PERMISSIONS as readonly Permission[]).includes(permission);
}

/** Super admin: todo. Resto: solo permisos asignables que tenga el rol en la organización (o en alguna, si no se indica `organizationId`). */
export function can(
  subject: AuthSubject,
  permission: Permission,
  organizationId?: string,
): boolean {
  if (subject.isSuperAdmin) return true;
  if (!isAssignable(permission)) return false;
  return subject.memberships.some(
    (m) =>
      (organizationId === undefined || m.organizationId === organizationId) &&
      m.permissions.includes(permission),
  );
}

/** Roles que el sujeto puede asignar en una organización: el super admin cualquiera; con `members:manage`, solo roles sin `members:manage` y con permisos propios. */
export function assignableRoles(
  subject: AuthSubject,
  organizationId: string,
  roles: RoleDef[],
): RoleDef[] {
  if (subject.isSuperAdmin) return roles;
  if (!can(subject, "members:manage", organizationId)) return [];
  const own = new Set(
    subject.memberships
      .filter((m) => m.organizationId === organizationId)
      .flatMap((m) => m.permissions)
      .filter(isAssignable),
  );
  return roles.filter(
    (r) =>
      !r.permissions.includes("members:manage") &&
      r.permissions.every((p) => own.has(p)),
  );
}

export function highestRole(subject: AuthSubject): AppRole {
  if (subject.isSuperAdmin) return "super_admin";
  if (can(subject, "members:manage")) return "admin";
  if (can(subject, "events:manage")) return "organizer";
  return "customer";
}

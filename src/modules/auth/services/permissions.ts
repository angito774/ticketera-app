export const ORG_ROLES = ["admin", "organizer"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

/** Rol global de la persona: el más alto que tenga. `customer` = sin membresías. */
export type AppRole = "super_admin" | OrgRole | "customer";

export type Permission =
  | "organizations:manage"
  | "members:manage"
  | "events:manage"
  | "tickets:redeem";

export interface AuthSubject {
  isSuperAdmin: boolean;
  memberships: { organizationId: string; role: OrgRole }[];
}

const ORG_ROLE_PERMISSIONS: Record<OrgRole, readonly Permission[]> = {
  admin: ["members:manage", "events:manage", "tickets:redeem"],
  organizer: ["events:manage", "tickets:redeem"],
};

/** Super admin: todo. Resto: depende del rol en la organización (o en alguna, si no se indica `organizationId`). */
export function can(
  subject: AuthSubject,
  permission: Permission,
  organizationId?: string,
): boolean {
  if (subject.isSuperAdmin) return true;
  return subject.memberships.some(
    (m) =>
      (organizationId === undefined || m.organizationId === organizationId) &&
      ORG_ROLE_PERMISSIONS[m.role].includes(permission),
  );
}

/** Roles que el sujeto puede asignar en una organización: el super admin cualquiera; un admin solo organizadores. */
export function assignableRoles(
  subject: AuthSubject,
  organizationId: string,
): OrgRole[] {
  if (subject.isSuperAdmin) return [...ORG_ROLES];
  return can(subject, "members:manage", organizationId) ? ["organizer"] : [];
}

export function highestRole(subject: AuthSubject): AppRole {
  if (subject.isSuperAdmin) return "super_admin";
  if (subject.memberships.some((m) => m.role === "admin")) return "admin";
  if (subject.memberships.length > 0) return "organizer";
  return "customer";
}

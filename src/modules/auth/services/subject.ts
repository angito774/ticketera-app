import {
  ASSIGNABLE_PERMISSIONS,
  type AuthSubject,
  type Permission,
} from "@/modules/auth/services/permissions";

export interface SubjectRow {
  isSuperAdmin: boolean;
  memberships: {
    organizationId: string;
    roleId: string;
    role: { permissions: string[] };
  }[];
}

const assignable: readonly string[] = ASSIGNABLE_PERMISSIONS;

/** Arma el sujeto de autorización desde la fila de usuario; ignora permisos guardados que no sean asignables. */
export function toAuthSubject(row: SubjectRow): AuthSubject {
  return {
    isSuperAdmin: row.isSuperAdmin,
    memberships: row.memberships.map((m) => ({
      organizationId: m.organizationId,
      roleId: m.roleId,
      permissions: m.role.permissions.filter((p): p is Permission =>
        assignable.includes(p),
      ),
    })),
  };
}

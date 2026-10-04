import { and, asc, count, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { escapeLike } from "@/lib/escape-like";
import { organizationMembers, organizations, roles, users } from "@/db/schema";
import {
  PAGE_SIZE,
  pageCount,
  type UserListQuery,
} from "@/modules/admin/schemas/member-list.schema";
import type { CurrentUser } from "@/modules/auth/services/current-user.service";
import { loadRoleDefs } from "@/modules/admin/services/role-defs";
import { assignableRoles, can } from "@/modules/auth/services/permissions";

export interface RoleOption {
  id: string;
  name: string;
}

export interface MemberListRow {
  memberId: string;
  userId: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  roleId: string;
  roleName: string;
  organizationId: string;
  organizationName: string;
  emailVerified: boolean;
  lastSignInAt: string | null;
  editable: boolean;
  assignableRoles: RoleOption[];
}

export interface MemberList {
  rows: MemberListRow[];
  total: number;
  page: number;
  pageCount: number;
}

export interface ManageableOrganization {
  id: string;
  name: string;
  assignableRoles: RoleOption[];
}

const toOption = ({ id, name }: RoleOption): RoleOption => ({ id, name });

/** null = sin restricción (super admin); array = ids de organizaciones que el actor administra. */
function manageableOrgIds(actor: CurrentUser): string[] | null {
  if (actor.isSuperAdmin) return null;
  return actor.memberships
    .filter((m) => can(actor, "members:manage", m.organizationId))
    .map((m) => m.organizationId);
}

export async function listMembers(
  actor: CurrentUser,
  query: UserListQuery,
): Promise<MemberList> {
  const empty: MemberList = { rows: [], total: 0, page: 1, pageCount: 1 };
  const scope = manageableOrgIds(actor);
  if (scope && scope.length === 0) return empty;

  if (query.org && scope && !scope.includes(query.org)) return empty;

  const search = query.q ? `%${escapeLike(query.q)}%` : null;
  const where = and(
    scope ? inArray(organizationMembers.organizationId, scope) : undefined,
    query.org ? eq(organizationMembers.organizationId, query.org) : undefined,
    query.role ? eq(organizationMembers.roleId, query.role) : undefined,
    query.status
      ? eq(users.emailVerified, query.status === "verified")
      : undefined,
    search
      ? or(ilike(users.fullName, search), ilike(users.email, search))
      : undefined,
  );

  const [{ total }] = await db
    .select({ total: count() })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .innerJoin(
      organizations,
      eq(organizations.id, organizationMembers.organizationId),
    )
    .innerJoin(roles, eq(roles.id, organizationMembers.roleId))
    .where(where);

  const pages = pageCount(total, PAGE_SIZE);
  const page = Math.min(Math.max(query.page, 1), pages);

  const data = await db
    .select({
      memberId: organizationMembers.id,
      userId: users.id,
      fullName: users.fullName,
      email: users.email,
      avatarUrl: users.avatarUrl,
      roleId: organizationMembers.roleId,
      roleName: roles.name,
      organizationId: organizations.id,
      organizationName: organizations.name,
      emailVerified: users.emailVerified,
      lastSignInAt: users.lastSignInAt,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .innerJoin(
      organizations,
      eq(organizations.id, organizationMembers.organizationId),
    )
    .innerJoin(roles, eq(roles.id, organizationMembers.roleId))
    .where(where)
    .orderBy(sql`${users.fullName} asc nulls last`, asc(users.email))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const allRoles = await loadRoleDefs();
  const rows = data.map((row): MemberListRow => {
    const assignable = assignableRoles(actor, row.organizationId, allRoles).map(toOption);
    return {
      ...row,
      lastSignInAt: row.lastSignInAt ? new Date(row.lastSignInAt).toISOString() : null,
      editable:
        row.userId !== actor.id && assignable.some((r) => r.id === row.roleId),
      assignableRoles: assignable,
    };
  });

  return { rows, total, page, pageCount: pages };
}

export async function listManageableOrganizations(
  actor: CurrentUser,
): Promise<ManageableOrganization[]> {
  const scope = manageableOrgIds(actor);
  if (scope && scope.length === 0) return [];

  const rows = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(scope ? inArray(organizations.id, scope) : undefined)
    .orderBy(asc(organizations.name));

  const allRoles = await loadRoleDefs();
  return rows.map((org) => ({
    ...org,
    assignableRoles: assignableRoles(actor, org.id, allRoles).map(toOption),
  }));
}

/** Todos los roles del catálogo, para filtros y formularios; [] si el actor no gestiona miembros. */
export async function listRoleOptions(actor: CurrentUser): Promise<RoleOption[]> {
  const scope = manageableOrgIds(actor);
  if (scope && scope.length === 0) return [];
  return (await loadRoleDefs()).map(toOption);
}

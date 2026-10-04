import { and, asc, count, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { organizationMembers, roles } from "@/db/schema";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/pg-errors";
import {
  roleInUseMessage,
  samePermissions,
  type RoleCreateInput,
  type RoleUpdateInput,
} from "@/modules/admin/schemas/role.schema";
import { AdminError } from "@/modules/admin/services/admin.service";
import type { CurrentUser } from "@/modules/auth/services/current-user.service";
import { can, type Permission } from "@/modules/auth/services/permissions";
import { syncRoleMetadataForRole } from "@/modules/auth/services/user-sync.service";

export interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  permissions: Permission[];
  isSystem: boolean;
  memberCount: number;
}

const DUPLICATE_MESSAGE = "Ya existe un rol con ese nombre/slug";

function assertCanManage(actor: CurrentUser): void {
  if (!can(actor, "roles:manage")) throw new AdminError("Sin permiso");
}

/** Columna de la tabla externa calificada a mano: en la subconsulta, un "id" sin tabla se resolvería a `organization_members.id`. */
const ROLE_ID = sql.raw('"roles"."id"');

export async function listRoles(actor: CurrentUser): Promise<RoleRow[]> {
  assertCanManage(actor);
  const rows = await db
    .select({
      id: roles.id,
      name: roles.name,
      description: roles.description,
      permissions: roles.permissions,
      isSystem: roles.isSystem,
      memberCount: sql<number>`(select count(*)::int from ${organizationMembers} where ${organizationMembers.roleId} = ${ROLE_ID})`,
    })
    .from(roles)
    .orderBy(desc(roles.isSystem), asc(roles.name));
  return rows.map((r) => ({ ...r, permissions: r.permissions as Permission[] }));
}

export async function createRole(
  actor: CurrentUser,
  input: RoleCreateInput,
): Promise<void> {
  assertCanManage(actor);
  try {
    await db.insert(roles).values({
      id: input.id,
      name: input.name,
      description: input.description,
      permissions: input.permissions,
      isSystem: false,
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new AdminError(DUPLICATE_MESSAGE);
    throw error;
  }
}

export async function updateRole(
  actor: CurrentUser,
  input: RoleUpdateInput,
): Promise<void> {
  assertCanManage(actor);

  const current = await db.query.roles.findFirst({ where: eq(roles.id, input.id) });
  if (!current) throw new AdminError("Rol no encontrado");

  const permissionsChanged = !samePermissions(current.permissions, input.permissions);
  if (current.isSystem && permissionsChanged) {
    throw new AdminError("Los permisos de un rol de sistema no se pueden cambiar");
  }

  try {
    await db
      .update(roles)
      .set({
        name: input.name,
        description: input.description,
        ...(current.isSystem ? {} : { permissions: input.permissions }),
      })
      .where(eq(roles.id, input.id));
  } catch (error) {
    if (isUniqueViolation(error)) throw new AdminError(DUPLICATE_MESSAGE);
    throw error;
  }

  if (!current.isSystem && permissionsChanged) {
    await syncRoleMetadataForRole(input.id);
  }
}

export async function deleteRole(actor: CurrentUser, id: string): Promise<void> {
  assertCanManage(actor);

  let deleted: { id: string }[];
  try {
    deleted = await db
      .delete(roles)
      .where(
        and(
          eq(roles.id, id),
          eq(roles.isSystem, false),
          sql`not exists (select 1 from ${organizationMembers} where ${organizationMembers.roleId} = ${id})`,
        ),
      )
      .returning({ id: roles.id });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new AdminError("No se puede eliminar: el rol está en uso");
    }
    throw error;
  }
  if (deleted.length > 0) return;

  const role = await db.query.roles.findFirst({ where: eq(roles.id, id) });
  if (!role) throw new AdminError("Rol no encontrado");
  if (role.isSystem) {
    throw new AdminError("Los roles de sistema no se pueden eliminar");
  }
  const [{ n }] = await db
    .select({ n: count() })
    .from(organizationMembers)
    .where(eq(organizationMembers.roleId, id));
  throw new AdminError(roleInUseMessage(n));
}

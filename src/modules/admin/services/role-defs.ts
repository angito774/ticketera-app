import { asc } from "drizzle-orm";

import { db } from "@/db";
import { roles } from "@/db/schema";
import {
  ASSIGNABLE_PERMISSIONS,
  type Permission,
  type RoleDef,
} from "@/modules/auth/services/permissions";

/** Todos los roles del catálogo (por nombre), con solo los permisos asignables. */
export async function loadRoleDefs(): Promise<RoleDef[]> {
  const rows = await db.select().from(roles).orderBy(asc(roles.name));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    isSystem: r.isSystem,
    permissions: r.permissions.filter((p): p is Permission =>
      (ASSIGNABLE_PERMISSIONS as readonly string[]).includes(p),
    ),
  }));
}

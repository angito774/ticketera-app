import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { users } from "@/db/schema";
import {
  fromClerkUser,
  superAdminEmail,
} from "@/modules/auth/services/clerk-user";
import {
  can,
  highestRole,
  type AppRole,
  type AuthSubject,
  type Permission,
} from "@/modules/auth/services/permissions";
import { toAuthSubject } from "@/modules/auth/services/subject";
import {
  syncRoleMetadata,
  upsertUser,
} from "@/modules/auth/services/user-sync.service";

export interface CurrentUser extends AuthSubject {
  id: string;
  email: string;
  fullName: string | null;
  role: AppRole;
}

async function loadUser(id: string) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
    with: { memberships: { with: { role: true } } },
  });
}

/**
 * Usuario de la sesión con sus roles, leídos de Postgres. Si todavía no existe en la DB (el webhook
 * puede no haber llegado) o es el correo del super admin sin promover, se sincroniza desde Clerk.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  let row = await loadUser(userId);
  const needsPromotion =
    row && !row.isSuperAdmin && row.email === superAdminEmail();
  if (!row || needsPromotion) {
    const clerkUser = await currentUser();
    const fields = clerkUser && fromClerkUser(clerkUser);
    if (!fields) return null;
    await upsertUser(fields);
    row = await loadUser(userId);
    if (row?.isSuperAdmin) await syncRoleMetadata(userId);
  }
  if (!row) return null;

  const subject = toAuthSubject(row);
  return {
    ...subject,
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    role: highestRole(subject),
  };
});

/** Para server components/actions: redirige al login sin sesión y a la home si falta el permiso. */
export async function requirePermission(
  permission: Permission,
  organizationId?: string,
): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!can(user, permission, organizationId)) redirect("/");
  return user;
}

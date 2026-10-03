import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import {
  isSuperAdminUser,
  type ClerkUserFields,
} from "@/modules/auth/services/clerk-user";
import { highestRole } from "@/modules/auth/services/permissions";

/** Inserta o actualiza la copia local del usuario de Clerk. Nunca le quita el super admin a nadie. */
export async function upsertUser(fields: ClerkUserFields): Promise<void> {
  const values = {
    email: fields.email,
    fullName: fields.fullName,
    avatarUrl: fields.avatarUrl,
    emailVerified: fields.emailVerified,
    authProviders: fields.authProviders,
    lastSignInAt: fields.lastSignInAt,
  };
  const promote = isSuperAdminUser(fields) ? { isSuperAdmin: true } : {};

  await db
    .insert(users)
    .values({ id: fields.id, ...values, ...promote })
    .onConflictDoUpdate({ target: users.id, set: { ...values, ...promote } });
}

export async function deleteUser(id: string): Promise<void> {
  await db.delete(users).where(eq(users.id, id));
}

/** Refleja el rol más alto en `publicMetadata.role` de Clerk para que la UI lo lea sin consultar la DB. */
export async function syncRoleMetadata(userId: string): Promise<void> {
  const row = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { memberships: true },
  });
  if (!row) return;
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      role: highestRole({
        isSuperAdmin: row.isSuperAdmin,
        memberships: row.memberships.map((m) => ({
          organizationId: m.organizationId,
          role: m.role,
        })),
      }),
    },
  });
}

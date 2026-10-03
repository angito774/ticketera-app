import { clerkClient } from "@clerk/nextjs/server";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizationMembers, users } from "@/db/schema";
import {
  isSuperAdminUser,
  type ClerkUserFields,
} from "@/modules/auth/services/clerk-user";
import { highestRole } from "@/modules/auth/services/permissions";
import { toAuthSubject } from "@/modules/auth/services/subject";

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

/** Llamadas simultáneas máximas a Clerk al re-sincronizar los miembros de un rol. */
const METADATA_SYNC_BATCH = 10;

const withRoles = { memberships: { with: { role: true } } } as const;

async function pushRoleMetadata(
  client: Awaited<ReturnType<typeof clerkClient>>,
  row: Parameters<typeof toAuthSubject>[0] & { id: string },
): Promise<void> {
  await client.users.updateUserMetadata(row.id, {
    publicMetadata: { role: highestRole(toAuthSubject(row)) },
  });
}

/** Refleja el rol más alto en `publicMetadata.role` de Clerk para que la UI lo lea sin consultar la DB. */
export async function syncRoleMetadata(userId: string): Promise<void> {
  const row = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: withRoles,
  });
  if (!row) return;
  await pushRoleMetadata(await clerkClient(), row);
}

/** Recalcula `publicMetadata.role` de todos los usuarios con membresía del rol (p. ej. tras editar sus permisos). */
export async function syncRoleMetadataForRole(roleId: string): Promise<void> {
  const members = await db
    .selectDistinct({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(eq(organizationMembers.roleId, roleId));
  if (members.length === 0) return;
  const rows = await db.query.users.findMany({
    where: inArray(
      users.id,
      members.map((m) => m.userId),
    ),
    with: withRoles,
  });
  const client = await clerkClient();
  // En lotes y tolerando fallos: la base es la fuente de verdad y la metadata solo alimenta la UI;
  // un error de Clerk no debe tumbar un cambio de permisos ya guardado ni dejar al resto sin sincronizar.
  for (let i = 0; i < rows.length; i += METADATA_SYNC_BATCH) {
    const results = await Promise.allSettled(
      rows.slice(i, i + METADATA_SYNC_BATCH).map((row) => pushRoleMetadata(client, row)),
    );
    for (const result of results) {
      if (result.status === "rejected") {
        console.error("No se pudo sincronizar publicMetadata.role", result.reason);
      }
    }
  }
}

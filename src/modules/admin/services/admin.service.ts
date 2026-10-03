import { randomBytes, randomUUID } from "node:crypto";

import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { clerkClient } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { isUniqueViolation } from "@/lib/pg-errors";
import { organizationMembers, organizations } from "@/db/schema";
import type { AddMemberInput } from "@/modules/admin/schemas/admin.schema";
import type { OrganizationInput } from "@/modules/admin/schemas/organization.schema";
import type { CurrentUser } from "@/modules/auth/services/current-user.service";
import { fromClerkUser } from "@/modules/auth/services/clerk-user";
import { addMemberGuardError, memberGuardError } from "@/modules/admin/services/member-guard";
import { loadRoleDefs } from "@/modules/admin/services/role-defs";
import {
  assignableRoles,
  can,
  type RoleDef,
} from "@/modules/auth/services/permissions";
import {
  syncRoleMetadata,
  upsertUser,
} from "@/modules/auth/services/user-sync.service";

export class AdminError extends Error {}

export async function createOrganization(
  actor: CurrentUser,
  input: OrganizationInput,
): Promise<void> {
  if (!can(actor, "organizations:manage")) throw new AdminError("Sin permiso");
  const exists = await db.query.organizations.findFirst({
    where: eq(organizations.slug, input.slug),
  });
  if (exists) {
    throw new AdminError("Ya existe una organización con ese nombre/slug");
  }
  try {
    await db
      .insert(organizations)
      .values({ id: `org_${randomUUID()}`, name: input.name, slug: input.slug });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AdminError("Ya existe una organización con ese nombre/slug");
    }
    throw error;
  }
}

/** Busca el usuario en Clerk por correo; si no existe lo crea con una contraseña temporal. */
async function findOrCreateClerkUser(input: AddMemberInput) {
  const client = await clerkClient();
  const { data } = await client.users.getUserList({
    emailAddress: [input.email],
  });
  if (data[0]) return { user: data[0], temporaryPassword: null };

  const [firstName, ...rest] = input.fullName.split(" ");
  // Clerk exige contraseñas de 15+ caracteres: 18 bytes en base64url son 24.
  const temporaryPassword = randomBytes(18).toString("base64url");
  try {
    const user = await client.users.createUser({
      emailAddress: [input.email],
      firstName,
      lastName: rest.join(" ") || undefined,
      password: temporaryPassword,
    });
    return { user, temporaryPassword };
  } catch (error) {
    // Un 422 de Clerk (política de contraseñas, campos requeridos…) no es un fallo del servidor: se muestra su motivo.
    if (isClerkAPIResponseError(error)) {
      const reason = error.errors[0]?.longMessage ?? error.errors[0]?.message ?? error.message;
      throw new AdminError(`Clerk no pudo crear la cuenta: ${reason}`);
    }
    throw error;
  }
}

/** Agrega (o reasigna) a una persona en una organización. Devuelve la contraseña temporal si se creó la cuenta. */
export async function addMember(
  actor: CurrentUser,
  input: AddMemberInput,
): Promise<{ temporaryPassword: string | null }> {
  const roles = await loadRoleDefs();
  if (
    !assignableRoles(actor, input.organizationId, roles).some(
      (r) => r.id === input.role,
    )
  ) {
    throw new AdminError("No puedes asignar ese rol en esta organización");
  }
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, input.organizationId),
  });
  if (!org) throw new AdminError("Organización no encontrada");

  const { user, temporaryPassword } = await findOrCreateClerkUser(input);
  const fields = fromClerkUser(user);
  if (!fields) throw new AdminError("La cuenta no tiene correo");

  const existing = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, org.id),
      eq(organizationMembers.userId, user.id),
    ),
  });
  const denied = addMemberGuardError(actor, user.id, existing ?? null, roles);
  if (denied) throw new AdminError(denied);
  await upsertUser(fields);

  await db
    .insert(organizationMembers)
    .values({
      id: `mem_${randomUUID()}`,
      organizationId: org.id,
      userId: user.id,
      roleId: input.role,
    })
    .onConflictDoUpdate({
      target: [organizationMembers.organizationId, organizationMembers.userId],
      set: { roleId: input.role },
    });
  await syncRoleMetadata(user.id);
  return { temporaryPassword };
}

async function loadManageableMember(
  actor: CurrentUser,
  memberId: string,
  roles: RoleDef[],
) {
  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.id, memberId),
  });
  if (!member) throw new AdminError("Miembro no encontrado");
  const denied = memberGuardError(actor, member, roles);
  if (denied) throw new AdminError(denied);
  return member;
}

export async function changeMemberRole(
  actor: CurrentUser,
  memberId: string,
  role: string,
): Promise<void> {
  const roles = await loadRoleDefs();
  const member = await loadManageableMember(actor, memberId, roles);
  if (
    !assignableRoles(actor, member.organizationId, roles).some(
      (r) => r.id === role,
    )
  ) {
    throw new AdminError("No puedes asignar ese rol");
  }
  await db
    .update(organizationMembers)
    .set({ roleId: role })
    .where(eq(organizationMembers.id, memberId));
  await syncRoleMetadata(member.userId);
}

export async function removeMember(
  actor: CurrentUser,
  memberId: string,
): Promise<void> {
  const member = await loadManageableMember(
    actor,
    memberId,
    await loadRoleDefs(),
  );
  await db
    .delete(organizationMembers)
    .where(
      and(
        eq(organizationMembers.id, memberId),
        eq(organizationMembers.organizationId, member.organizationId),
      ),
    );
  await syncRoleMetadata(member.userId);
}

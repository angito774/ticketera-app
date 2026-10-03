import { randomBytes, randomUUID } from "node:crypto";

import { clerkClient } from "@clerk/nextjs/server";
import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizationMembers, organizations } from "@/db/schema";
import {
  slugify,
  type AddMemberInput,
  type CreateOrganizationInput,
} from "@/modules/admin/schemas/admin.schema";
import type { CurrentUser } from "@/modules/auth/services/current-user.service";
import { fromClerkUser } from "@/modules/auth/services/clerk-user";
import {
  assignableRoles,
  can,
  type OrgRole,
} from "@/modules/auth/services/permissions";
import {
  syncRoleMetadata,
  upsertUser,
} from "@/modules/auth/services/user-sync.service";

export class AdminError extends Error {}

export interface MemberRow {
  id: string;
  userId: string;
  email: string;
  fullName: string | null;
  role: OrgRole;
}

export interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  members: MemberRow[];
  /** Roles que el usuario actual puede asignar aquí (vacío = solo lectura). */
  assignableRoles: OrgRole[];
}

/** Organizaciones que el actor puede ver: todas (super admin) o donde administra miembros. */
export async function listOrganizations(
  actor: CurrentUser,
): Promise<OrganizationRow[]> {
  const orgIds = actor.isSuperAdmin
    ? null
    : actor.memberships
        .filter((m) => can(actor, "members:manage", m.organizationId))
        .map((m) => m.organizationId);
  if (orgIds && orgIds.length === 0) return [];

  const rows = await db.query.organizations.findMany({
    where: orgIds ? inArray(organizations.id, orgIds) : undefined,
    orderBy: asc(organizations.name),
    with: { members: { with: { user: true }, orderBy: asc(organizationMembers.createdAt) } },
  });

  return rows.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    assignableRoles: assignableRoles(actor, org.id),
    members: org.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email,
      fullName: m.user.fullName,
      role: m.role,
    })),
  }));
}

export async function createOrganization(
  actor: CurrentUser,
  input: CreateOrganizationInput,
): Promise<void> {
  if (!can(actor, "organizations:manage")) throw new AdminError("Sin permiso");
  const slug = slugify(input.name);
  if (!slug) throw new AdminError("Nombre inválido");
  const exists = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });
  if (exists) throw new AdminError("Ya existe una organización con ese nombre");
  await db
    .insert(organizations)
    .values({ id: `org_${randomUUID()}`, name: input.name, slug });
}

/** Busca el usuario en Clerk por correo; si no existe lo crea con una contraseña temporal. */
async function findOrCreateClerkUser(input: AddMemberInput) {
  const client = await clerkClient();
  const { data } = await client.users.getUserList({
    emailAddress: [input.email],
  });
  if (data[0]) return { user: data[0], temporaryPassword: null };

  const [firstName, ...rest] = input.fullName.split(" ");
  const temporaryPassword = randomBytes(9).toString("base64url");
  const user = await client.users.createUser({
    emailAddress: [input.email],
    firstName,
    lastName: rest.join(" ") || undefined,
    password: temporaryPassword,
  });
  return { user, temporaryPassword };
}

/** Agrega (o reasigna) a una persona en una organización. Devuelve la contraseña temporal si se creó la cuenta. */
export async function addMember(
  actor: CurrentUser,
  input: AddMemberInput,
): Promise<{ temporaryPassword: string | null }> {
  if (!assignableRoles(actor, input.organizationId).includes(input.role)) {
    throw new AdminError("No puedes asignar ese rol en esta organización");
  }
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, input.organizationId),
  });
  if (!org) throw new AdminError("Organización no encontrada");

  const { user, temporaryPassword } = await findOrCreateClerkUser(input);
  const fields = fromClerkUser(user);
  if (!fields) throw new AdminError("La cuenta no tiene correo");
  await upsertUser(fields);

  await db
    .insert(organizationMembers)
    .values({
      id: `mem_${randomUUID()}`,
      organizationId: org.id,
      userId: user.id,
      role: input.role,
    })
    .onConflictDoUpdate({
      target: [organizationMembers.organizationId, organizationMembers.userId],
      set: { role: input.role },
    });
  await syncRoleMetadata(user.id);
  return { temporaryPassword };
}

async function loadManageableMember(actor: CurrentUser, memberId: string) {
  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.id, memberId),
  });
  if (!member) throw new AdminError("Miembro no encontrado");
  if (member.userId === actor.id) {
    throw new AdminError("No puedes modificar tu propio rol");
  }
  // Un admin solo gestiona organizadores; cambiar/quitar admins es del super admin.
  if (
    !assignableRoles(actor, member.organizationId).includes(member.role)
  ) {
    throw new AdminError("Sin permiso sobre este miembro");
  }
  return member;
}

export async function changeMemberRole(
  actor: CurrentUser,
  memberId: string,
  role: OrgRole,
): Promise<void> {
  const member = await loadManageableMember(actor, memberId);
  if (!assignableRoles(actor, member.organizationId).includes(role)) {
    throw new AdminError("No puedes asignar ese rol");
  }
  await db
    .update(organizationMembers)
    .set({ role })
    .where(eq(organizationMembers.id, memberId));
  await syncRoleMetadata(member.userId);
}

export async function removeMember(
  actor: CurrentUser,
  memberId: string,
): Promise<void> {
  const member = await loadManageableMember(actor, memberId);
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

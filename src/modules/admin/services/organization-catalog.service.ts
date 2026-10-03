import { and, asc, count, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { escapeLike } from "@/lib/escape-like";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/pg-errors";
import {
  coupons,
  events,
  organizationMembers,
  organizations,
  venues,
} from "@/db/schema";
import {
  PAGE_SIZE,
  pageCount,
} from "@/modules/admin/schemas/member-list.schema";
import type {
  OrganizationListQuery,
  OrganizationUpdateInput,
} from "@/modules/admin/schemas/organization.schema";
import { AdminError } from "@/modules/admin/services/admin.service";
import type { CurrentUser } from "@/modules/auth/services/current-user.service";
import { can } from "@/modules/auth/services/permissions";

export interface OrganizationCatalogRow {
  id: string;
  name: string;
  slug: string;
  stripeConnectStatus: string;
  memberCount: number;
  eventCount: number;
  canEdit: boolean;
}

export interface OrganizationCatalog {
  rows: OrganizationCatalogRow[];
  total: number;
  page: number;
  pageCount: number;
}

/**
 * Columna de la tabla externa, calificada a mano: Drizzle renderiza las columnas sin tabla dentro de un
 * `select` simple y, en una subconsulta, "id" se resolvería a la tabla interna (p. ej. `events.id` uuid).
 */
const ORG_ID = sql.raw('"organizations"."id"');

export async function listOrganizationCatalog(
  actor: CurrentUser,
  query: OrganizationListQuery,
): Promise<OrganizationCatalog> {
  const scope = actor.isSuperAdmin
    ? null
    : actor.memberships
        .filter((m) => can(actor, "members:manage", m.organizationId))
        .map((m) => m.organizationId);
  if (scope && scope.length === 0) {
    return { rows: [], total: 0, page: 1, pageCount: 1 };
  }

  const search = query.q ? `%${escapeLike(query.q)}%` : null;
  const where = and(
    scope ? inArray(organizations.id, scope) : undefined,
    search
      ? or(ilike(organizations.name, search), ilike(organizations.slug, search))
      : undefined,
  );

  const [{ total }] = await db
    .select({ total: count() })
    .from(organizations)
    .where(where);

  const pages = pageCount(total, PAGE_SIZE);
  const page = Math.min(Math.max(query.page, 1), pages);

  const data = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      stripeConnectStatus: organizations.stripeConnectStatus,
      memberCount: sql<number>`(select count(*)::int from ${organizationMembers} where ${organizationMembers.organizationId} = ${ORG_ID})`,
      eventCount: sql<number>`(select count(*)::int from ${events} where ${events.organizationId} = ${ORG_ID})`,
    })
    .from(organizations)
    .where(where)
    .orderBy(asc(organizations.name), asc(organizations.id))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const canEdit = can(actor, "organizations:manage");
  return {
    rows: data.map((row) => ({ ...row, canEdit })),
    total,
    page,
    pageCount: pages,
  };
}

export async function updateOrganization(
  actor: CurrentUser,
  input: OrganizationUpdateInput,
): Promise<void> {
  if (!can(actor, "organizations:manage")) throw new AdminError("Sin permiso");

  const current = await db.query.organizations.findFirst({
    where: eq(organizations.id, input.id),
  });
  if (!current) throw new AdminError("Organización no encontrada");

  const duplicate = await db.query.organizations.findFirst({
    where: and(
      eq(organizations.slug, input.slug),
      ne(organizations.id, input.id),
    ),
  });
  if (duplicate) {
    throw new AdminError("Ya existe una organización con ese nombre/slug");
  }

  try {
    await db
      .update(organizations)
      .set({ name: input.name, slug: input.slug })
      .where(eq(organizations.id, input.id));
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AdminError("Ya existe una organización con ese nombre/slug");
    }
    throw error;
  }
}

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

export async function deleteOrganization(
  actor: CurrentUser,
  id: string,
): Promise<void> {
  if (!can(actor, "organizations:manage")) throw new AdminError("Sin permiso");

  const hasNone = (
    table: typeof organizationMembers | typeof events | typeof venues | typeof coupons,
  ) =>
    sql`not exists (select 1 from ${table} where ${table.organizationId} = ${id})`;

  let deleted: { id: string }[];
  try {
    deleted = await db
      .delete(organizations)
      .where(
        and(
          eq(organizations.id, id),
          hasNone(organizationMembers),
          hasNone(events),
          hasNone(venues),
          hasNone(coupons),
        ),
      )
      .returning({ id: organizations.id });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new AdminError(
        "No se puede eliminar: la organización tiene datos asociados",
      );
    }
    throw error;
  }
  if (deleted.length > 0) return;

  const countFor = async (
    table: typeof organizationMembers | typeof events | typeof venues | typeof coupons,
  ) => {
    const [{ n }] = await db
      .select({ n: count() })
      .from(table)
      .where(eq(table.organizationId, id));
    return n;
  };
  const [members, eventCount, venueCount, couponCount] = await Promise.all([
    countFor(organizationMembers),
    countFor(events),
    countFor(venues),
    countFor(coupons),
  ]);

  const blockers = [
    members > 0 && plural(members, "miembro", "miembros"),
    eventCount > 0 && plural(eventCount, "evento", "eventos"),
    venueCount > 0 && plural(venueCount, "recinto", "recintos"),
    couponCount > 0 && plural(couponCount, "cupón", "cupones"),
  ].filter((part): part is string => Boolean(part));

  if (blockers.length === 0) throw new AdminError("Organización no encontrada");
  throw new AdminError(`No se puede eliminar: tiene ${blockers.join(", ")}`);
}

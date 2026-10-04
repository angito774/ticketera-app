import { and, count, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { organizationMembers, users } from "@/db/schema";
import { escapeLike } from "@/lib/escape-like";
import { PAGE_SIZE, pageCount } from "@/modules/admin/schemas/member-list.schema";
import { AdminError } from "@/modules/admin/services/admin.service";
import { can } from "@/modules/auth/services/permissions";
import type { CurrentUser } from "@/modules/auth/services/current-user.service";

export interface CustomerRow {
  id: string;
  fullName: string | null;
  email: string;
  emailVerified: boolean;
  authProviders: string[];
  lastSignInAt: string | null;
  createdAt: string;
}

export interface CustomerList {
  rows: CustomerRow[];
  total: number;
  page: number;
  pageCount: number;
}

const toIso = (value: Date | string | null): string | null =>
  value ? new Date(value).toISOString() : null;

export async function listCustomers(
  actor: CurrentUser,
  query: { page: number; q?: string },
): Promise<CustomerList> {
  if (!actor.isSuperAdmin && !can(actor, "members:manage")) {
    throw new AdminError("Sin permiso");
  }

  const search = query.q ? `%${escapeLike(query.q)}%` : null;
  const where = and(
    eq(users.isSuperAdmin, false),
    sql`not exists (select 1 from ${organizationMembers} where ${organizationMembers.userId} = "users"."id")`,
    search
      ? or(ilike(users.fullName, search), ilike(users.email, search))
      : undefined,
  );

  const [{ total }] = await db.select({ total: count() }).from(users).where(where);

  const pages = pageCount(total, PAGE_SIZE);
  const page = Math.min(Math.max(query.page, 1), pages);

  const data = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      emailVerified: users.emailVerified,
      authProviders: users.authProviders,
      lastSignInAt: users.lastSignInAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(where)
    .orderBy(sql`${users.lastSignInAt} desc nulls last`, users.email)
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const rows = data.map(
    (row): CustomerRow => ({
      ...row,
      lastSignInAt: toIso(row.lastSignInAt),
      createdAt: toIso(row.createdAt) as string,
    }),
  );

  return { rows, total, page, pageCount: pages };
}

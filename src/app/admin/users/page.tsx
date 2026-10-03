import type { Metadata } from "next";
import { Suspense } from "react";

import { Pagination } from "@/components/pagination";
import { MemberFilters } from "@/modules/admin/components/member-filters";
import { MembersTable } from "@/modules/admin/components/members-table";
import { PAGE_SIZE, userListQuerySchema } from "@/modules/admin/schemas/member-list.schema";
import { listManageableOrganizations, listMembers, listRoleOptions } from "@/modules/admin/services/member-list.service";
import { requirePermission } from "@/modules/auth/services/current-user.service";

export const metadata: Metadata = {
  title: "Usuarios · Ticketera",
};

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const user = await requirePermission("members:manage");
  const query = userListQuerySchema.parse(await searchParams);
  const [list, organizations, roles] = await Promise.all([
    listMembers(user, query),
    listManageableOrganizations(user),
    listRoleOptions(user),
  ]);

  function hrefFor(page: number) {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.role) params.set("role", query.role);
    if (query.org) params.set("org", query.org);
    if (query.status) params.set("status", query.status);
    if (page > 1) params.set("page", String(page));
    const search = params.toString();
    return search ? `/admin/users?${search}` : "/admin/users";
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <p className="text-sm text-muted-foreground">Administra quién accede al panel y con qué rol.</p>
      </header>

      <Suspense>
        <MemberFilters organizations={organizations} roles={roles} />
      </Suspense>

      <MembersTable rows={list.rows} organizations={organizations} />

      {list.rows.length > 0 && (
        <Pagination
          page={list.page}
          pageCount={list.pageCount}
          total={list.total}
          pageSize={PAGE_SIZE}
          hrefFor={hrefFor}
          noun="usuarios"
        />
      )}
    </div>
  );
}

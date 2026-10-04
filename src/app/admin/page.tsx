import type { Metadata } from "next";
import { Suspense } from "react";

import { Pagination } from "@/components/pagination";
import { OrganizationFilters } from "@/modules/admin/components/organization-filters";
import { OrganizationsTable } from "@/modules/admin/components/organizations-table";
import { PAGE_SIZE } from "@/modules/admin/schemas/member-list.schema";
import { organizationListQuerySchema } from "@/modules/admin/schemas/organization.schema";
import { listOrganizationCatalog } from "@/modules/admin/services/organization-catalog.service";
import { requirePermission } from "@/modules/auth/services/current-user.service";
import { can } from "@/modules/auth/services/permissions";

export const metadata: Metadata = {
  title: "Organizaciones · Ticketera",
};

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const user = await requirePermission("members:manage");
  const query = organizationListQuerySchema.parse(await searchParams);
  const { rows, total, page, pageCount } = await listOrganizationCatalog(user, query);

  function hrefFor(target: number) {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (target > 1) params.set("page", String(target));
    const search = params.toString();
    return search ? `/admin?${search}` : "/admin";
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Organizaciones</h1>
        <p className="text-sm text-muted-foreground">Gestiona las organizaciones del panel.</p>
      </header>

      <Suspense>
        <OrganizationFilters />
      </Suspense>

      <Suspense>
        <OrganizationsTable rows={rows} canCreate={can(user, "organizations:manage")} />
      </Suspense>

      {rows.length > 0 && (
        <Pagination
          page={page}
          pageCount={pageCount}
          total={total}
          pageSize={PAGE_SIZE}
          hrefFor={hrefFor}
          noun="organizaciones"
        />
      )}
    </div>
  );
}

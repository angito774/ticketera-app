import type { Metadata } from "next";
import { Suspense } from "react";

import { Pagination } from "@/components/pagination";
import { SearchFilter } from "@/components/search-filter";
import { CustomersTable } from "@/modules/admin/components/customers-table";
import { PAGE_SIZE } from "@/modules/admin/schemas/member-list.schema";
import { organizationListQuerySchema } from "@/modules/admin/schemas/organization.schema";
import { listCustomers } from "@/modules/admin/services/customer-list.service";
import { listManageableOrganizations } from "@/modules/admin/services/member-list.service";
import { requirePermission } from "@/modules/auth/services/current-user.service";

export const metadata: Metadata = {
  title: "Clientes · Ticketera",
};

export default async function AdminCustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  const user = await requirePermission("members:manage");
  const query = organizationListQuerySchema.parse(await searchParams);
  const [list, organizations] = await Promise.all([listCustomers(user, query), listManageableOrganizations(user)]);

  function hrefFor(page: number) {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (page > 1) params.set("page", String(page));
    const search = params.toString();
    return search ? `/admin/customers?${search}` : "/admin/customers";
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          Personas registradas que aún no pertenecen a ninguna organización.
        </p>
      </header>

      <Suspense>
        <SearchFilter
          label="Buscar por nombre o correo"
          placeholder="Buscar por nombre o correo"
          clearLabel="Limpiar búsqueda"
        />
      </Suspense>

      <CustomersTable rows={list.rows} organizations={organizations} hasQuery={Boolean(query.q)} />

      {list.rows.length > 0 && (
        <Pagination
          page={list.page}
          pageCount={list.pageCount}
          total={list.total}
          pageSize={PAGE_SIZE}
          hrefFor={hrefFor}
          noun="clientes"
        />
      )}
    </div>
  );
}

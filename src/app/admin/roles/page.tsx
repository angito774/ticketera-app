import type { Metadata } from "next";

import { RolesTable } from "@/modules/admin/components/roles-table";
import { listRoles } from "@/modules/admin/services/role.service";
import { requirePermission } from "@/modules/auth/services/current-user.service";

export const metadata: Metadata = {
  title: "Roles · Ticketera",
};

export default async function AdminRolesPage() {
  const user = await requirePermission("roles:manage");
  const rows = await listRoles(user);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Roles</h1>
        <p className="text-sm text-muted-foreground">Define qué puede hacer cada rol dentro de una organización.</p>
      </header>

      <RolesTable rows={rows} />
    </div>
  );
}

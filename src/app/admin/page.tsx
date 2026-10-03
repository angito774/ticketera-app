import type { Metadata } from "next";

import { AdminPanel } from "@/modules/admin/components/admin-panel";
import { listOrganizations } from "@/modules/admin/services/admin.service";
import { requirePermission } from "@/modules/auth/services/current-user.service";

export const metadata: Metadata = {
  title: "Administración · Ticketera",
};

export default async function AdminPage() {
  const user = await requirePermission("members:manage");
  const organizations = await listOrganizations(user);

  return <AdminPanel organizations={organizations} canCreateOrganizations={user.isSuperAdmin} />;
}

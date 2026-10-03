import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getNavSections, ROLE_LABEL } from "@/modules/auth/services/dashboard-nav";
import { requirePermission } from "@/modules/auth/services/current-user.service";

export const metadata: Metadata = {
  title: "Panel de organizador · Ticketera",
};

export default async function OrganizerLayout({ children }: LayoutProps<"/organizer">) {
  const user = await requirePermission("events:manage");
  return (
    <DashboardShell
      sections={getNavSections(user)}
      user={{ name: user.fullName ?? user.email, roleLabel: ROLE_LABEL[user.role] }}
    >
      {children}
    </DashboardShell>
  );
}

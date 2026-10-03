import type { Metadata } from "next";

import { OrganizerShell } from "@/modules/organizer/components/organizer-shell";
import { requirePermission } from "@/modules/auth/services/current-user.service";

export const metadata: Metadata = {
  title: "Panel de organizador · Ticketera",
};

export default async function OrganizerLayout({ children }: LayoutProps<"/organizer">) {
  await requirePermission("events:manage");
  return <OrganizerShell>{children}</OrganizerShell>;
}

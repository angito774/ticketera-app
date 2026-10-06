import { can } from "@/modules/auth/services/permissions";
import { requirePermission } from "@/modules/auth/services/current-user.service";
import { OrganizerDashboardView } from "@/modules/organizer/components/organizer-dashboard-view";

export default async function OrganizerPage({ searchParams }: PageProps<"/organizer">) {
  const { saved } = await searchParams;
  const user = await requirePermission("events:manage");

  return (
    <OrganizerDashboardView
      notice={saved === "draft" || saved === "published" ? saved : null}
      canFeature={can(user, "events:feature")}
    />
  );
}

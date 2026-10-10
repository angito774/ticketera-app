import { can } from "@/modules/auth/services/permissions";
import { requirePermission } from "@/modules/auth/services/current-user.service";
import { OrganizerDashboardView } from "@/modules/organizer/components/organizer-dashboard-view";
import {
  listConnectViews,
  syncConnectStatus,
} from "@/modules/payments/services/connect.service";

async function loadConnectViews(user: Awaited<ReturnType<typeof requirePermission>>) {
  const views = await listConnectViews(user);
  return Promise.all(
    views.map(async (view) => {
      if (!view.hasAccount || view.status === "active") return view;
      try {
        return { ...view, status: await syncConnectStatus(view.organizationId) };
      } catch {
        return view;
      }
    }),
  );
}

export default async function OrganizerPage({ searchParams }: PageProps<"/organizer">) {
  const { saved, connect } = await searchParams;
  const user = await requirePermission("events:manage");
  const connectViews = await loadConnectViews(user);

  return (
    <OrganizerDashboardView
      notice={saved === "draft" || saved === "published" ? saved : null}
      canFeature={can(user, "events:feature")}
      connectViews={connectViews}
      connectNotice={connect === "return" || connect === "refresh" ? connect : null}
    />
  );
}

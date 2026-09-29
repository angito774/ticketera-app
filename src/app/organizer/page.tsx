import { OrganizerDashboardView } from "@/modules/organizer/components/organizer-dashboard-view";

export default async function OrganizerPage({ searchParams }: PageProps<"/organizer">) {
  const { saved } = await searchParams;

  return <OrganizerDashboardView notice={saved === "draft" || saved === "published" ? saved : null} />;
}

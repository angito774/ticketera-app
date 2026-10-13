import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { can } from "@/modules/auth/services/permissions";
import { requirePermission } from "@/modules/auth/services/current-user.service";
import { EventEditor } from "@/modules/organizer/components/event-editor";
import { getEventForEdit } from "@/modules/organizer/services/event-edit.service";
import { getEventFormOptions } from "@/modules/organizer/services/event-options.service";

export const metadata: Metadata = {
  title: "Editar evento · Ticketera",
};

export default async function EditEventPage({ params }: PageProps<"/organizer/events/[id]/edit">) {
  const { id } = await params;
  const user = await requirePermission("events:manage");
  const [options, initial] = await Promise.all([getEventFormOptions(user), getEventForEdit(user, id)]);
  if (!initial) notFound();
  return <EventEditor options={options} initial={initial} canFeature={can(user, "events:feature")} />;
}

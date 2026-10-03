import type { Metadata } from "next";

import { requirePermission } from "@/modules/auth/services/current-user.service";
import { EventEditor } from "@/modules/organizer/components/event-editor";
import { getEventFormOptions } from "@/modules/organizer/services/event-options.service";

export const metadata: Metadata = {
  title: "Crear evento · Ticketera",
};

export default async function NewEventPage() {
  const user = await requirePermission("events:manage");
  const options = await getEventFormOptions(user);
  return <EventEditor options={options} />;
}

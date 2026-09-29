import type { Metadata } from "next";

import { EventEditor } from "@/modules/organizer/components/event-editor";

export const metadata: Metadata = {
  title: "Editar borrador · Ticketera",
};

export default async function EditEventPage({ params }: PageProps<"/organizer/events/[id]/edit">) {
  const { id } = await params;
  return <EventEditor eventId={id} />;
}

import type { Metadata } from "next";

import { EventEditor } from "@/modules/organizer/components/event-editor";

export const metadata: Metadata = {
  title: "Crear evento · Ticketera",
};

export default function NewEventPage() {
  return <EventEditor />;
}

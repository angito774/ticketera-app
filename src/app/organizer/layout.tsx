import type { Metadata } from "next";

import { OrganizerShell } from "@/modules/organizer/components/organizer-shell";

export const metadata: Metadata = {
  title: "Panel de organizador · Ticketera",
};

export default function OrganizerLayout({ children }: LayoutProps<"/organizer">) {
  return <OrganizerShell>{children}</OrganizerShell>;
}

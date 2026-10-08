import type { Metadata } from "next";

import { LegalPage } from "@/modules/legal/components/legal-page";
import { RETURNS_DOCUMENT } from "@/modules/legal/content/returns.content";

export const metadata: Metadata = {
  title: "Garantía y devoluciones · Ticketera",
};

export default function ReturnsPage() {
  return <LegalPage {...RETURNS_DOCUMENT} />;
}

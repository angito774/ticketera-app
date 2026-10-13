import type { Metadata } from "next";

import { PRIVACY_DOCUMENT } from "@/modules/legal/content/privacy.content";
import { LegalPage } from "@/modules/legal/components/legal-page";

export const metadata: Metadata = {
  title: "Política de privacidad · Ticketera",
};

export default function PrivacyPage() {
  return <LegalPage {...PRIVACY_DOCUMENT} />;
}

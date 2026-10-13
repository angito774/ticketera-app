import type { Metadata } from "next";

import { TERMS_DOCUMENT } from "@/modules/legal/content/terms.content";
import { LegalPage } from "@/modules/legal/components/legal-page";

export const metadata: Metadata = {
  title: "Términos y condiciones · Ticketera",
};

export default function TermsPage() {
  return <LegalPage {...TERMS_DOCUMENT} />;
}

import type { Metadata } from "next";

import { LegalPage } from "@/modules/legal/components/legal-page";
import { PROMOTIONS_DOCUMENT } from "@/modules/legal/content/promotions.content";

export const metadata: Metadata = {
  title: "Términos de campañas comerciales · Ticketera",
};

export default function PromotionsPage() {
  return <LegalPage {...PROMOTIONS_DOCUMENT} />;
}

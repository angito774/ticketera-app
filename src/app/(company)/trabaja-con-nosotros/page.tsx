import type { Metadata } from "next";

import { CompanyPage } from "@/modules/company/components/company-page";
import { CAREERS_DOCUMENT } from "@/modules/company/content/company.content";

export const metadata: Metadata = {
  title: "Trabaja con nosotros · Ticketera",
};

export default function CareersPage() {
  return <CompanyPage {...CAREERS_DOCUMENT} />;
}

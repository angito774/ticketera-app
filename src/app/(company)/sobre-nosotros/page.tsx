import type { Metadata } from "next";

import { CompanyPage } from "@/modules/company/components/company-page";
import { ABOUT_DOCUMENT } from "@/modules/company/content/company.content";

export const metadata: Metadata = {
  title: "Sobre nosotros · Ticketera",
};

export default function AboutPage() {
  return <CompanyPage {...ABOUT_DOCUMENT} />;
}

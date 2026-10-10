import type { Metadata } from "next";

import { CompanyPage } from "@/modules/company/components/company-page";
import { CONTACT_DOCUMENT } from "@/modules/company/content/company.content";

export const metadata: Metadata = {
  title: "Contacto · Ticketera",
};

export default function ContactPage() {
  return <CompanyPage {...CONTACT_DOCUMENT} />;
}

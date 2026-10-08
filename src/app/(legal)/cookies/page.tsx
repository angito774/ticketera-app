import type { Metadata } from "next";

import { LegalPage } from "@/modules/legal/components/legal-page";
import { COOKIES_DOCUMENT } from "@/modules/legal/content/cookies.content";

export const metadata: Metadata = {
  title: "Política de cookies · Ticketera",
};

export default function CookiesPage() {
  return <LegalPage {...COOKIES_DOCUMENT} />;
}

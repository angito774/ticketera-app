import type { Metadata } from "next";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { PrivacyPolicy } from "@/components/privacy-policy";

export const metadata: Metadata = {
  title: "Política de privacidad · Ticketera",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pt-6 pb-16 md:px-6 lg:px-8 lg:pt-10 lg:pb-20">
        <PrivacyPolicy />
      </main>

      <Footer />
    </div>
  );
}

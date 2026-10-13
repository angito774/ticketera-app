import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

export default function CompanyLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pt-6 pb-16 md:px-6 lg:px-8 lg:pt-10 lg:pb-20">
        {children}
      </main>

      <Footer />
    </div>
  );
}

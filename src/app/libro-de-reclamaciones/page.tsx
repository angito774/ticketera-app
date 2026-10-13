import type { Metadata } from "next";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { ClaimForm } from "@/modules/claims/components/claim-form";
import { CLAIM_RESPONSE_BUSINESS_DAYS, CLAIMS_PROVIDER } from "@/modules/claims/config/claims-provider";

export const metadata: Metadata = {
  title: "Libro de Reclamaciones · Ticketera",
};

export default function ComplaintsBookPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="contents print:hidden">
        <Header />
      </div>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 pt-6 pb-16 md:px-6 lg:pt-10 lg:pb-20">
        <header className="flex flex-col gap-3 print:hidden">
          <h1 className="text-3xl font-bold tracking-tight">Libro de Reclamaciones</h1>
          <p className="text-muted-foreground">
            Completa la hoja de reclamación para registrar un reclamo o una queja sobre nuestros servicios.
          </p>
        </header>

        <section aria-labelledby="provider-heading" className="flex flex-col gap-3 rounded-3xl border bg-card p-5 print:hidden">
          <h2 id="provider-heading" className="text-lg font-semibold">
            Datos del proveedor
          </h2>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="font-medium">Razón social</dt>
            <dd>{CLAIMS_PROVIDER.legalName}</dd>
            <dt className="font-medium">RUC</dt>
            <dd>{CLAIMS_PROVIDER.ruc}</dd>
            <dt className="font-medium">Domicilio</dt>
            <dd>{CLAIMS_PROVIDER.address}</dd>
            <dt className="font-medium">Correo</dt>
            <dd>{CLAIMS_PROVIDER.email}</dd>
          </dl>
        </section>

        <section aria-labelledby="info-heading" className="flex flex-col gap-3 text-sm print:hidden">
          <h2 id="info-heading" className="text-lg font-semibold">
            Antes de enviar
          </h2>
          <p>
            <strong>Reclamo:</strong> disconformidad relacionada con los productos o servicios contratados.{" "}
            <strong>Queja:</strong> malestar o descontento respecto a la atención al público, que no afecta al producto
            o servicio.
          </p>
          <p>
            Responderemos en un plazo máximo de {CLAIM_RESPONSE_BUSINESS_DAYS} días hábiles. Al enviar la hoja verás una
            constancia con tu código; guárdala, ya que no enviamos copia por correo electrónico.
          </p>
        </section>

        <ClaimForm />
      </main>

      <div className="contents print:hidden">
        <Footer />
      </div>
    </div>
  );
}

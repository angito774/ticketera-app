"use client";

import { Printer } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { formatDate, formatPrice } from "@/lib/format";
import { DOCUMENT_TYPE_LABELS } from "@/modules/checkout/schemas/checkout.schema";
import { CLAIMS_PROVIDER, CLAIM_RESPONSE_BUSINESS_DAYS } from "../config/claims-provider";
import { CLAIM_ITEM_TYPE_LABELS, CLAIM_TYPE_LABELS } from "../schemas/claim.schema";
import type { ClaimReceipt as ClaimReceiptData } from "../types/claim.types";

// Al imprimir se oculta con display:none todo elemento que no contiene ni está dentro de la constancia
// (sin conservar altura, así no queda una página en blanco). Requiere :has() (navegadores actuales);
// requiere prueba manual de impresión.
const PRINT_STYLES = `@media print {
  body *:not(:has([data-claim-receipt])):not([data-claim-receipt]):not([data-claim-receipt] *) { display: none !important; }
}`;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:grid sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words whitespace-pre-line">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-base font-semibold">{title}</h3>
      <dl className="flex flex-col gap-3">{children}</dl>
    </section>
  );
}

/** Constancia del reclamo registrado; se puede imprimir o guardar como PDF desde el navegador. */
export function ClaimReceipt({ receipt }: { receipt: ClaimReceiptData }) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <article
      data-claim-receipt
      aria-labelledby="claim-receipt-heading"
      className="flex flex-col gap-6 rounded-3xl border bg-card p-5 lg:p-7 print:rounded-none print:border-0 print:p-0"
    >
      <style>{PRINT_STYLES}</style>
      <header className="flex flex-col gap-2">
        <h2
          id="claim-receipt-heading"
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-bold outline-none"
        >
          Constancia de registro
        </h2>
        <p className="text-sm text-muted-foreground">Código de registro</p>
        <p className="text-3xl font-bold tracking-wide">{receipt.code}</p>
      </header>

      <p role="note" className="rounded-2xl bg-accent p-4 text-sm leading-relaxed text-accent-foreground">
        <strong>Guarda este código. No enviamos copia por correo electrónico.</strong> Imprime esta constancia o
        guárdala como PDF ahora: al salir de esta página no podrás volver a verla.
      </p>

      <Section title="Registro">
        <Row label="Código">{receipt.code}</Row>
        <Row label="Tipo">{CLAIM_TYPE_LABELS[receipt.type]}</Row>
        <Row label="Fecha de registro">{formatDate(receipt.createdAt)}</Row>
        <Row label="Fecha límite de respuesta">
          {formatDate(`${receipt.dueDate}T12:00:00-05:00`)} ({CLAIM_RESPONSE_BUSINESS_DAYS} días hábiles)
        </Row>
      </Section>

      <Section title="Datos del consumidor">
        <Row label="Nombre completo">{receipt.fullName}</Row>
        <Row label="Documento">
          {DOCUMENT_TYPE_LABELS[receipt.documentType]} {receipt.documentNumber}
        </Row>
        <Row label="Domicilio">{receipt.address}</Row>
        <Row label="Teléfono">{receipt.phone}</Row>
        <Row label="Correo electrónico">{receipt.email}</Row>
        {receipt.isMinor && (
          <>
            <Row label="Apoderado">{receipt.guardianFullName}</Row>
            <Row label="Documento del apoderado">{receipt.guardianDocumentNumber}</Row>
          </>
        )}
      </Section>

      <Section title="Bien contratado">
        <Row label="Tipo">{CLAIM_ITEM_TYPE_LABELS[receipt.itemType]}</Row>
        <Row label="Descripción">{receipt.itemDescription}</Row>
        {receipt.claimedAmountCents !== null && (
          <Row label="Monto reclamado">{formatPrice(receipt.claimedAmountCents / 100)}</Row>
        )}
        {receipt.orderReference && <Row label="Referencia de orden">{receipt.orderReference}</Row>}
      </Section>

      <Section title="Detalle">
        <Row label="Detalle">{receipt.detail}</Row>
        <Row label="Pedido del consumidor">{receipt.consumerRequest}</Row>
      </Section>

      <Section title="Proveedor">
        <Row label="Razón social">{CLAIMS_PROVIDER.legalName}</Row>
        <Row label="RUC">{CLAIMS_PROVIDER.ruc}</Row>
        <Row label="Domicilio">{CLAIMS_PROVIDER.address}</Row>
        <Row label="Correo">{CLAIMS_PROVIDER.email}</Row>
      </Section>

      <Button
        type="button"
        size="lg"
        className="h-12 w-full cursor-pointer sm:w-fit print:hidden"
        onClick={() => window.print()}
      >
        <Printer aria-hidden="true" />
        Imprimir o guardar como PDF
      </Button>
    </article>
  );
}

"use client";

import { Info, QrCode } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  FormField,
  INPUT_CLASSES,
  checkoutFieldId,
  fieldA11yProps,
} from "@/modules/checkout/components/form-field";
import { PaymentMethodField } from "@/modules/checkout/components/payment-method-field";
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPES,
  type CheckoutFieldErrors,
  type CheckoutFormValues,
  type DocumentType,
} from "@/modules/checkout/schemas/checkout.schema";

interface CheckoutFormProps {
  values: CheckoutFormValues;
  errors: CheckoutFieldErrors;
  onChange: (patch: Partial<CheckoutFormValues>) => void;
  className?: string;
}

const SECTION_CLASSES = "flex flex-col gap-5 rounded-3xl border bg-card p-5 lg:p-7";
const INFO_CLASSES =
  "flex items-start gap-3 rounded-2xl bg-accent p-4 text-sm leading-relaxed text-accent-foreground";

/** Datos del comprador, método de pago y aceptación de términos (campos controlados). */
export function CheckoutForm({ values, errors, onChange, className }: CheckoutFormProps) {
  const setCard = (patch: Partial<CheckoutFormValues["card"]>) =>
    onChange({ card: { ...values.card, ...patch } });

  return (
    <div className={cn("flex flex-col gap-4 lg:gap-6", className)}>
      <section className={SECTION_CLASSES}>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold lg:text-xl">Datos del comprador</h2>
          <p className="text-sm text-muted-foreground">
            Enviaremos tus entradas al correo que indiques.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField field="fullName" label="Nombre completo" error={errors.fullName}>
            <Input
              {...fieldA11yProps("fullName", errors.fullName)}
              type="text"
              autoComplete="name"
              placeholder="Como figura en tu documento"
              value={values.fullName}
              onChange={(event) => onChange({ fullName: event.target.value })}
              className={INPUT_CLASSES}
            />
          </FormField>
          <FormField field="email" label="Correo electrónico" error={errors.email}>
            <Input
              {...fieldA11yProps("email", errors.email)}
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={values.email}
              onChange={(event) => onChange({ email: event.target.value })}
              className={INPUT_CLASSES}
            />
          </FormField>
          <FormField field="documentNumber" label="Documento de identidad" error={errors.documentNumber}>
            <div className="flex gap-2">
              <Select
                value={values.documentType}
                items={DOCUMENT_TYPE_LABELS}
                onValueChange={(documentType) => onChange({ documentType: documentType as DocumentType })}
              >
                <SelectTrigger aria-label="Tipo de documento" className="h-12! w-32 shrink-0 rounded-xl px-3.5 text-base md:text-[0.9375rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {DOCUMENT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                {...fieldA11yProps("documentNumber", errors.documentNumber)}
                type="text"
                inputMode={values.documentType === "PASSPORT" ? "text" : "numeric"}
                placeholder="Número"
                value={values.documentNumber}
                onChange={(event) => onChange({ documentNumber: event.target.value })}
                className={INPUT_CLASSES}
              />
            </div>
          </FormField>
          <FormField field="phone" label="Celular" error={errors.phone}>
            <Input
              {...fieldA11yProps("phone", errors.phone)}
              type="tel"
              autoComplete="tel-national"
              inputMode="tel"
              placeholder="987 654 321"
              value={values.phone}
              onChange={(event) => onChange({ phone: event.target.value })}
              className={INPUT_CLASSES}
            />
          </FormField>
        </div>
      </section>

      <section className={SECTION_CLASSES}>
        <h2 className="text-lg font-semibold lg:text-xl">Método de pago</h2>
        <PaymentMethodField
          value={values.paymentMethod}
          onChange={(paymentMethod) => onChange({ paymentMethod })}
        />

        {values.paymentMethod === "card" && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <FormField field="card.number" label="Número de tarjeta" error={errors["card.number"]} className="col-span-2">
              <Input
                {...fieldA11yProps("card.number", errors["card.number"])}
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="0000 0000 0000 0000"
                maxLength={19}
                value={values.card.number}
                onChange={(event) => setCard({ number: event.target.value })}
                className={INPUT_CLASSES}
              />
            </FormField>
            <FormField field="card.expiry" label="Vencimiento" error={errors["card.expiry"]}>
              <Input
                {...fieldA11yProps("card.expiry", errors["card.expiry"])}
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/AA"
                maxLength={5}
                value={values.card.expiry}
                onChange={(event) => setCard({ expiry: event.target.value })}
                className={INPUT_CLASSES}
              />
            </FormField>
            <FormField field="card.cvv" label="CVV" error={errors["card.cvv"]}>
              <Input
                {...fieldA11yProps("card.cvv", errors["card.cvv"])}
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="3 o 4 dígitos"
                maxLength={4}
                value={values.card.cvv}
                onChange={(event) => setCard({ cvv: event.target.value })}
                className={INPUT_CLASSES}
              />
            </FormField>
            <FormField field="card.holder" label="Nombre en la tarjeta" error={errors["card.holder"]} className="col-span-2 sm:col-span-4">
              <Input
                {...fieldA11yProps("card.holder", errors["card.holder"])}
                type="text"
                autoComplete="cc-name"
                placeholder="Como aparece en la tarjeta"
                value={values.card.holder}
                onChange={(event) => setCard({ holder: event.target.value })}
                className={INPUT_CLASSES}
              />
            </FormField>
          </div>
        )}

        {values.paymentMethod === "yape" && (
          <p className={INFO_CLASSES}>
            <QrCode className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            Al continuar te mostraremos un código QR para pagar desde tu app de Yape.
          </p>
        )}

        {values.paymentMethod === "cash" && (
          <p className={INFO_CLASSES}>
            <Info className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            Generaremos un código de pago para que pagues en agentes, bodegas o tu banca móvil.
          </p>
        )}
      </section>

      <div className="flex flex-col gap-1.5 px-1">
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
          <input
            {...fieldA11yProps("acceptedTerms", errors.acceptedTerms)}
            type="checkbox"
            checked={values.acceptedTerms}
            onChange={(event) => onChange({ acceptedTerms: event.target.checked })}
            className="mt-0.5 size-5 shrink-0 cursor-pointer rounded accent-primary"
          />
          <span>
            Acepto los{" "}
            <a href="#" className="font-medium text-primary underline-offset-4 hover:underline">
              Términos y condiciones
            </a>{" "}
            y la{" "}
            <a href="#" className="font-medium text-primary underline-offset-4 hover:underline">
              Política de privacidad
            </a>
            .
          </span>
        </label>
        {errors.acceptedTerms && (
          <p id={`${checkoutFieldId("acceptedTerms")}-error`} className="pl-8 text-[0.8125rem] text-destructive">
            {errors.acceptedTerms}
          </p>
        )}
      </div>
    </div>
  );
}

"use client";

import { Lock } from "lucide-react";

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
  FIELD_INPUT_CLASSES as INPUT_CLASSES,
  FieldError,
  FormField,
  RequiredMark,
  fieldA11yProps,
} from "@/components/form-field";
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPES,
  type CheckoutField,
  type CheckoutFieldErrors,
  type CheckoutFormValues,
  type DocumentType,
} from "@/modules/checkout/schemas/checkout.schema";

/** id del DOM de un campo del checkout: "fullName" → "checkout-fullName". */
export function checkoutFieldId(field: string): string {
  return `checkout-${field.replace(/\./g, "-")}`;
}

interface CheckoutFormProps {
  values: CheckoutFormValues;
  errors: CheckoutFieldErrors;
  onChange: (patch: Partial<CheckoutFormValues>) => void;
  /** Al salir de un campo: permite marcarlo en rojo si quedó incompleto. */
  onFieldBlur: (field: CheckoutField) => void;
  className?: string;
}

const SECTION_CLASSES = "flex flex-col gap-5 rounded-3xl border bg-card p-5 lg:p-7";
const INFO_CLASSES =
  "flex items-start gap-3 rounded-2xl bg-accent p-4 text-sm leading-relaxed text-accent-foreground";

/** Datos del comprador, aviso del pago en Stripe y aceptación de términos (campos controlados). */
export function CheckoutForm({ values, errors, onChange, onFieldBlur, className }: CheckoutFormProps) {
  return (
    <div className={cn("flex flex-col gap-4 lg:gap-6", className)}>
      <section className={SECTION_CLASSES}>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold lg:text-xl">Datos del comprador</h2>
          <p className="text-sm text-muted-foreground">
            Enviaremos tus entradas al correo que indiques. Los campos con <RequiredMark /> son obligatorios.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField required id={checkoutFieldId("fullName")} label="Nombre completo" error={errors.fullName}>
            <Input
              {...fieldA11yProps(checkoutFieldId("fullName"), errors.fullName, true)}
              onBlur={() => onFieldBlur("fullName")}
              type="text"
              autoComplete="name"
              placeholder="Como figura en tu documento"
              value={values.fullName}
              onChange={(event) => onChange({ fullName: event.target.value })}
              className={INPUT_CLASSES}
            />
          </FormField>
          <FormField required id={checkoutFieldId("email")} label="Correo electrónico" error={errors.email}>
            <Input
              {...fieldA11yProps(checkoutFieldId("email"), errors.email, true)}
              onBlur={() => onFieldBlur("email")}
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={values.email}
              onChange={(event) => onChange({ email: event.target.value })}
              className={INPUT_CLASSES}
            />
          </FormField>
          <FormField required id={checkoutFieldId("documentNumber")} label="Documento de identidad" error={errors.documentNumber}>
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
                {...fieldA11yProps(checkoutFieldId("documentNumber"), errors.documentNumber, true)}
                onBlur={() => onFieldBlur("documentNumber")}
                type="text"
                inputMode={values.documentType === "PASSPORT" ? "text" : "numeric"}
                placeholder="Número"
                value={values.documentNumber}
                onChange={(event) => onChange({ documentNumber: event.target.value })}
                className={INPUT_CLASSES}
              />
            </div>
          </FormField>
          <FormField required id={checkoutFieldId("phone")} label="Celular" error={errors.phone}>
            <Input
              {...fieldA11yProps(checkoutFieldId("phone"), errors.phone, true)}
              onBlur={() => onFieldBlur("phone")}
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
        <h2 className="text-lg font-semibold lg:text-xl">Pago</h2>
        <p className={INFO_CLASSES}>
          <Lock className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          Al continuar te llevaremos a Stripe, nuestra pasarela de pago segura, para completar el pago con tarjeta.
          Ticketera no recibe ni guarda los datos de tu tarjeta.
        </p>
      </section>

      <div
        className={cn(
          "flex flex-col gap-1.5 rounded-2xl px-1 transition-colors",
          errors.acceptedTerms && "bg-destructive/5 px-3 py-3 ring-1 ring-destructive/40"
        )}
      >
        <label className={cn("flex cursor-pointer items-start gap-3 text-sm leading-relaxed", errors.acceptedTerms && "text-destructive")}>
          <input
            {...fieldA11yProps(checkoutFieldId("acceptedTerms"), errors.acceptedTerms, true)}
            type="checkbox"
            checked={values.acceptedTerms}
            onChange={(event) => onChange({ acceptedTerms: event.target.checked })}
            className={cn(
              "mt-0.5 size-5 shrink-0 cursor-pointer rounded accent-primary",
              errors.acceptedTerms && "outline-2 outline-offset-1 outline-destructive"
            )}
          />
          <span>
            Acepto los{" "}
            <span className="font-medium text-foreground">Términos y condiciones</span>{" "}
            y la{" "}
            <span className="font-medium text-foreground">Política de privacidad</span>
            .<RequiredMark />
          </span>
        </label>
        {errors.acceptedTerms && (
          <FieldError id={checkoutFieldId("acceptedTerms")} className="pl-8">
            {errors.acceptedTerms}
          </FieldError>
        )}
      </div>
    </div>
  );
}

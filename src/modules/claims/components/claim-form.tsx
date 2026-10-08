"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";

import {
  FIELD_INPUT_CLASSES,
  FieldError,
  FormField,
  RequiredMark,
  fieldA11yProps,
} from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPES,
  type DocumentType,
} from "@/modules/checkout/schemas/checkout.schema";
import { submitClaimAction } from "../actions/claims.actions";
import {
  CLAIM_DETAIL_MAX,
  CLAIM_ITEM_TYPE_LABELS,
  CLAIM_ITEM_TYPES,
  CLAIM_REQUEST_MAX,
  CLAIM_TYPE_LABELS,
  CLAIM_TYPES,
  claimSubmitSchema,
} from "../schemas/claim.schema";
import type { ClaimReceipt as ClaimReceiptData } from "../types/claim.types";
import { ClaimReceipt } from "./claim-receipt";

const UNEXPECTED_ERROR = "No pudimos registrar tu reclamo. Inténtalo de nuevo más tarde.";
const PENDING_MESSAGE = "Enviando tu reclamo…";

interface FormValues {
  type: string;
  fullName: string;
  documentType: DocumentType;
  documentNumber: string;
  address: string;
  phone: string;
  email: string;
  isMinor: boolean;
  guardianFullName: string;
  guardianDocumentType: DocumentType;
  guardianDocumentNumber: string;
  itemType: string;
  itemDescription: string;
  claimedAmount: string;
  orderReference: string;
  detail: string;
  consumerRequest: string;
  acceptedPrivacy: boolean;
  website: string;
}

type Field = keyof FormValues;
type Errors = Partial<Record<Field, string>>;

const INITIAL_VALUES: FormValues = {
  type: "",
  fullName: "",
  documentType: "DNI",
  documentNumber: "",
  address: "",
  phone: "",
  email: "",
  isMinor: false,
  guardianFullName: "",
  guardianDocumentType: "DNI",
  guardianDocumentNumber: "",
  itemType: "",
  itemDescription: "",
  claimedAmount: "",
  orderReference: "",
  detail: "",
  consumerRequest: "",
  acceptedPrivacy: false,
  website: "",
};

const FIELD_ORDER: Field[] = [
  "type",
  "fullName",
  "documentType",
  "documentNumber",
  "address",
  "phone",
  "email",
  "isMinor",
  "guardianFullName",
  "guardianDocumentType",
  "guardianDocumentNumber",
  "itemType",
  "itemDescription",
  "claimedAmount",
  "orderReference",
  "detail",
  "consumerRequest",
  "acceptedPrivacy",
];

const GUARDIAN_FIELDS: Field[] = ["guardianFullName", "guardianDocumentType", "guardianDocumentNumber"];

const fieldId = (field: Field) => `claim-${field}`;

function focusFirstInvalid(errors: Errors) {
  const first = FIELD_ORDER.find((field) => errors[field]);
  if (first) document.getElementById(fieldId(first))?.focus();
}

const SECTION_CLASSES = "flex flex-col gap-5 rounded-3xl border bg-card p-5 lg:p-7";
const TOUCH_ROW_CLASSES =
  "flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-relaxed has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring rounded-lg";

interface RadioGroupFieldProps {
  field: "type" | "itemType";
  legend: string;
  options: readonly string[];
  labels: Record<string, string>;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

/** Grupo de radios nativos con apariencia de tarjeta (mismo patrón que el método de pago del checkout). */
function RadioGroupField({ field, legend, options, labels, value, error, onChange }: RadioGroupFieldProps) {
  const id = fieldId(field);
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className={cn("mb-1.5 text-sm font-medium", error && "text-destructive")}>
        {legend}
        <RequiredMark />
      </legend>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {options.map((option, index) => {
          const isSelected = option === value;
          return (
            <label
              key={option}
              className={cn(
                "flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border-[1.5px] px-4 text-[0.9375rem] font-semibold transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring",
                isSelected ? "border-primary bg-accent text-accent-foreground" : "bg-background hover:bg-muted",
                error && !isSelected && "border-destructive/60",
              )}
            >
              <input
                type="radio"
                id={index === 0 ? id : undefined}
                name={field}
                value={option}
                checked={isSelected}
                onChange={() => onChange(option)}
                className="sr-only"
              />
              {labels[option]}
            </label>
          );
        })}
      </div>
      {error && <FieldError id={id}>{error}</FieldError>}
    </fieldset>
  );
}

interface DocumentFieldProps {
  label: string;
  typeField: "documentType" | "guardianDocumentType";
  numberField: "documentNumber" | "guardianDocumentNumber";
  values: FormValues;
  errors: Errors;
  onChange: (patch: Partial<FormValues>) => void;
}

function DocumentField({ label, typeField, numberField, values, errors, onChange }: DocumentFieldProps) {
  const type = values[typeField];
  const error = errors[numberField] ?? errors[typeField];
  const numberId = fieldId(numberField);
  return (
    <FormField required id={numberId} label={label} error={error}>
      <div className="flex gap-2">
        <Select
          value={type}
          items={DOCUMENT_TYPE_LABELS}
          onValueChange={(next) => onChange({ [typeField]: next as DocumentType })}
        >
          <SelectTrigger
            id={fieldId(typeField)}
            aria-label={`Tipo de documento (${label})`}
            className="h-12! w-32 shrink-0 rounded-xl px-3.5 text-base md:text-[0.9375rem]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map((option) => (
              <SelectItem key={option} value={option}>
                {DOCUMENT_TYPE_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          {...fieldA11yProps(numberId, error, true)}
          name={numberField}
          type="text"
          inputMode={type === "PASSPORT" ? "text" : "numeric"}
          autoComplete="off"
          placeholder="Número"
          value={values[numberField]}
          onChange={(event) => onChange({ [numberField]: event.target.value })}
          className={FIELD_INPUT_CLASSES}
        />
      </div>
    </FormField>
  );
}

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className="text-xs text-muted-foreground" aria-hidden="true">
      {value.length}/{max}
    </span>
  );
}

function Section({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className={SECTION_CLASSES}>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold lg:text-xl">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** Hoja de reclamación: valida con el mismo schema que el servidor y, al registrar, muestra la constancia. */
export function ClaimForm() {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ClaimReceiptData | null>(null);
  const [isPending, startTransition] = useTransition();

  if (receipt) return <ClaimReceipt receipt={receipt} />;

  const update = (patch: Partial<FormValues>) => {
    setValues((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch) as Field[]) delete next[key];
      if ("documentType" in patch) delete next.documentNumber;
      if ("guardianDocumentType" in patch) delete next.guardianDocumentNumber;
      if (patch.isMinor === false) for (const key of GUARDIAN_FIELDS) delete next[key];
      return next;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;

    setServerError(null);
    const parsed = claimSubmitSchema.safeParse(values);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as Field | undefined;
        if (key && !(key in next)) next[key] = issue.message;
      }
      setErrors(next);
      focusFirstInvalid(next);
      return;
    }

    setErrors({});
    startTransition(async () => {
      try {
        const result = await submitClaimAction(parsed.data);
        if (result.ok) {
          setReceipt(result.receipt);
          return;
        }
        const fieldErrors = (result.fieldErrors ?? {}) as Errors;
        setErrors(fieldErrors);
        if (Object.keys(fieldErrors).length > 0) focusFirstInvalid(fieldErrors);
        setServerError(result.error);
      } catch {
        setServerError(UNEXPECTED_ERROR);
      }
    });
  };

  const text = (field: "fullName" | "address" | "phone" | "email" | "itemDescription" | "orderReference") => ({
    ...fieldA11yProps(fieldId(field), errors[field], field !== "orderReference"),
    name: field,
    value: values[field],
    onChange: (event: { target: { value: string } }) => update({ [field]: event.target.value }),
    className: FIELD_INPUT_CLASSES,
  });

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 lg:gap-6">
      <Section
        title="Tipo de registro"
        description={
          <>
            Los campos con <RequiredMark /> son obligatorios.
          </>
        }
      >
        <RadioGroupField
          field="type"
          legend="¿Qué quieres registrar?"
          options={CLAIM_TYPES}
          labels={CLAIM_TYPE_LABELS}
          value={values.type}
          error={errors.type}
          onChange={(type) => update({ type })}
        />
        <ul className="flex flex-col gap-1.5 rounded-2xl bg-accent p-4 text-sm leading-relaxed text-accent-foreground">
          <li>
            <strong>Reclamo:</strong> disconformidad relacionada con los productos o servicios que contrataste.
          </li>
          <li>
            <strong>Queja:</strong> malestar o descontento respecto a la atención al público, sin relación con el
            producto o servicio.
          </li>
        </ul>
      </Section>

      <Section title="Datos del consumidor">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField required id={fieldId("fullName")} label="Nombre completo" error={errors.fullName} className="sm:col-span-2">
            <Input {...text("fullName")} type="text" autoComplete="name" placeholder="Como figura en tu documento" />
          </FormField>
          <DocumentField
            label="Documento de identidad"
            typeField="documentType"
            numberField="documentNumber"
            values={values}
            errors={errors}
            onChange={update}
          />
          <FormField required id={fieldId("phone")} label="Teléfono" error={errors.phone}>
            <Input {...text("phone")} type="tel" inputMode="tel" autoComplete="tel" placeholder="987 654 321" />
          </FormField>
          <FormField required id={fieldId("email")} label="Correo electrónico" error={errors.email}>
            <Input {...text("email")} type="email" autoComplete="email" placeholder="tu@email.com" />
          </FormField>
          <FormField required id={fieldId("address")} label="Domicilio" error={errors.address}>
            <Input {...text("address")} type="text" autoComplete="street-address" placeholder="Calle, número, distrito" />
          </FormField>
        </div>

        <label className={TOUCH_ROW_CLASSES}>
          <input
            id={fieldId("isMinor")}
            name="isMinor"
            type="checkbox"
            checked={values.isMinor}
            onChange={(event) => update({ isMinor: event.target.checked })}
            className="mt-0.5 size-5 shrink-0 cursor-pointer rounded accent-primary"
          />
          <span>Soy menor de edad</span>
        </label>

        {values.isMinor && (
          <div className="flex flex-col gap-4 rounded-2xl border p-4">
            <h3 className="text-base font-semibold">Datos del padre, madre o tutor</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField required id={fieldId("guardianFullName")} label="Nombre completo del apoderado" error={errors.guardianFullName}>
                <Input
                  {...fieldA11yProps(fieldId("guardianFullName"), errors.guardianFullName, true)}
                  name="guardianFullName"
                  type="text"
                  autoComplete="off"
                  value={values.guardianFullName}
                  onChange={(event) => update({ guardianFullName: event.target.value })}
                  className={FIELD_INPUT_CLASSES}
                />
              </FormField>
              <DocumentField
                label="Documento del apoderado"
                typeField="guardianDocumentType"
                numberField="guardianDocumentNumber"
                values={values}
                errors={errors}
                onChange={update}
              />
            </div>
          </div>
        )}
      </Section>

      <Section title="Bien contratado">
        <RadioGroupField
          field="itemType"
          legend="¿Se trata de un producto o un servicio?"
          options={CLAIM_ITEM_TYPES}
          labels={CLAIM_ITEM_TYPE_LABELS}
          value={values.itemType}
          error={errors.itemType}
          onChange={(itemType) => update({ itemType })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField required id={fieldId("itemDescription")} label="Descripción del producto o servicio" error={errors.itemDescription} className="sm:col-span-2">
            <Input {...text("itemDescription")} type="text" autoComplete="off" placeholder="Ej.: Entrada para un concierto" />
          </FormField>
          <FormField id={fieldId("claimedAmount")} label="Monto reclamado (S/, opcional)" error={errors.claimedAmount}>
            <Input
              {...fieldA11yProps(fieldId("claimedAmount"), errors.claimedAmount)}
              name="claimedAmount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={values.claimedAmount}
              onChange={(event) => update({ claimedAmount: event.target.value })}
              className={FIELD_INPUT_CLASSES}
            />
          </FormField>
          <FormField id={fieldId("orderReference")} label="Número de orden (opcional)" error={errors.orderReference}>
            <Input {...text("orderReference")} type="text" autoComplete="off" />
          </FormField>
        </div>
      </Section>

      <Section title="Detalle">
        <FormField
          required
          id={fieldId("detail")}
          label="Detalle del reclamo o queja"
          error={errors.detail}
          labelAside={<Counter value={values.detail} max={CLAIM_DETAIL_MAX} />}
        >
          <Textarea
            {...fieldA11yProps(fieldId("detail"), errors.detail, true)}
            name="detail"
            rows={5}
            value={values.detail}
            onChange={(event) => update({ detail: event.target.value })}
            className="min-h-32 rounded-xl px-3.5 py-3 text-base md:text-[0.9375rem]"
          />
        </FormField>
        <FormField
          required
          id={fieldId("consumerRequest")}
          label="Pedido del consumidor"
          error={errors.consumerRequest}
          labelAside={<Counter value={values.consumerRequest} max={CLAIM_REQUEST_MAX} />}
        >
          <Textarea
            {...fieldA11yProps(fieldId("consumerRequest"), errors.consumerRequest, true)}
            name="consumerRequest"
            rows={4}
            value={values.consumerRequest}
            onChange={(event) => update({ consumerRequest: event.target.value })}
            className="min-h-28 rounded-xl px-3.5 py-3 text-base md:text-[0.9375rem]"
          />
        </FormField>
      </Section>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label>
          Sitio web
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={(event) => update({ website: event.target.value })}
          />
        </label>
      </div>

      <div
        className={cn(
          "flex flex-col gap-1.5 rounded-2xl px-1",
          errors.acceptedPrivacy && "bg-destructive/5 px-3 py-3 ring-1 ring-destructive/40",
        )}
      >
        <label className={cn(TOUCH_ROW_CLASSES, errors.acceptedPrivacy && "text-destructive")}>
          <input
            {...fieldA11yProps(fieldId("acceptedPrivacy"), errors.acceptedPrivacy, true)}
            name="acceptedPrivacy"
            type="checkbox"
            checked={values.acceptedPrivacy}
            onChange={(event) => update({ acceptedPrivacy: event.target.checked })}
            className="mt-0.5 size-5 shrink-0 cursor-pointer rounded accent-primary"
          />
          <span>
            Acepto la{" "}
            <Link href="/privacidad" className="rounded-sm font-medium text-foreground underline underline-offset-2">
              política de privacidad
            </Link>{" "}
            y el uso de mis datos para atender este registro.
            <RequiredMark />
          </span>
        </label>
        {errors.acceptedPrivacy && (
          <FieldError id={fieldId("acceptedPrivacy")} className="pl-8">
            {errors.acceptedPrivacy}
          </FieldError>
        )}
      </div>

      {serverError && (
        <p role="alert" className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
          {serverError}
        </p>
      )}
      <p role="status" className={cn("text-sm text-muted-foreground", !isPending && "sr-only")}>
        {isPending ? PENDING_MESSAGE : ""}
      </p>

      <Button type="submit" size="lg" className="h-12 w-full cursor-pointer sm:w-fit sm:px-8" aria-disabled={isPending}>
        {isPending ? "Enviando…" : "Enviar"}
      </Button>
    </form>
  );
}

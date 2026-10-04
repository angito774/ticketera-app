"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Info, Loader2 } from "lucide-react";

import { FIELD_INPUT_CLASSES, FormField, fieldA11yProps } from "@/components/form-field";
import { StickyBottomBar } from "@/components/sticky-bottom-bar";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createEventAction, updateEventAction } from "@/modules/organizer/actions/event.actions";
import { CoverImageField } from "@/modules/organizer/components/cover-image-field";
import { EventPreviewCard } from "@/modules/organizer/components/event-preview-card";
import {
  TicketTiersField,
  tierFieldId,
  tierToggleId,
} from "@/modules/organizer/components/ticket-tiers-field";
import {
  EMPTY_EVENT_FORM,
  MIN_DESCRIPTION,
  getEventFormErrors,
  hasFormErrors,
  toEventSaveInput,
  type EventFormErrors,
  type EventFormMode,
  type EventFormValues,
  type TierFormValues,
  type ZoneOption,
} from "@/modules/organizer/schemas/event-form.schema";
import type { EventEditData } from "@/modules/organizer/services/event-edit.service";
import type { EventFormOptions } from "@/modules/organizer/services/event-options.service";

interface EventEditorProps {
  options: EventFormOptions;
  /** Sin initial: crear evento. Con initial: editar ese evento. */
  initial?: EventEditData;
}

type SimpleField = "organizationId" | "title" | "categoryId" | "description" | "date" | "time" | "venueId" | "coverImageUrl";

const FIELD_ORDER: SimpleField[] = [
  "organizationId",
  "title",
  "categoryId",
  "description",
  "date",
  "time",
  "venueId",
  "coverImageUrl",
];
const fieldId = (field: SimpleField) => `event-${field}`;

const SECTION_CLASSES = "flex flex-col gap-5 rounded-3xl border bg-card p-5 lg:p-7";
const NATIVE_CONTROL_CLASSES =
  "w-full rounded-xl border border-input bg-transparent px-3.5 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-[0.9375rem]";

const PUBLISHED_NOTICE = "Un evento publicado solo permite editar título, descripción y portada.";
const CANCELLED_NOTICE = "Este evento está cancelado y no se puede editar.";

const tiersForZones = (zones: ZoneOption[]): TierFormValues[] =>
  zones.map((zone) => ({ zoneId: zone.id, enabled: false, price: "", quantity: "" }));

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
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

function firstInvalidId(errors: EventFormErrors): string | null {
  const field = FIELD_ORDER.find((item) => errors[item]);
  if (field) return fieldId(field);
  const tierIndex = errors.tierErrors?.findIndex((tierError) => Object.keys(tierError).length > 0) ?? -1;
  if (tierIndex >= 0) {
    const tierError = errors.tierErrors?.[tierIndex];
    if (tierError?.price) return tierFieldId(tierIndex, "price");
    if (tierError?.quantity) return tierFieldId(tierIndex, "quantity");
  }
  if (errors.tiers) return tierToggleId(0);
  return null;
}

/** Enlaces del resumen de errores: cada error de campo y, si hay, uno para los tipos de entrada. */
function errorSummaryItems(errors: EventFormErrors): { href: string; message: string }[] {
  const items = FIELD_ORDER.flatMap((field) => {
    const message = errors[field];
    return message ? [{ href: `#${fieldId(field)}`, message }] : [];
  });
  const tierIndex = errors.tierErrors?.findIndex((tierError) => Object.keys(tierError).length > 0) ?? -1;
  if (tierIndex >= 0) {
    const field = errors.tierErrors?.[tierIndex]?.price ? "price" : "quantity";
    items.push({ href: `#${tierFieldId(tierIndex, field)}`, message: "Revisa los precios y cantidades de las entradas." });
  } else if (errors.tiers) {
    items.push({ href: `#${tierToggleId(0)}`, message: errors.tiers });
  }
  return items;
}

export function EventEditor({ options, initial }: EventEditorProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();

  const status = initial?.status ?? "draft";
  const isPublished = status === "published";
  const isCancelled = status === "cancelled";
  const isEditing = Boolean(initial);
  const hasMultipleOrganizations = options.organizations.length > 1;

  const [values, setValues] = useState<EventFormValues>(
    () => initial?.values ?? { ...EMPTY_EVENT_FORM, organizationId: options.organizations[0]?.id ?? "" }
  );
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [submittedMode, setSubmittedMode] = useState<EventFormMode | null>(null);
  const [savingMode, setSavingMode] = useState<EventFormMode | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const venues = useMemo(
    () => options.venues.filter((venue) => venue.organizationId === values.organizationId),
    [options.venues, values.organizationId]
  );
  const selectedVenue = options.venues.find((venue) => venue.id === values.venueId) ?? null;
  const zones = selectedVenue?.zones ?? [];
  const selectedCategory = options.categories.find((category) => category.id === values.categoryId) ?? null;

  const lockStructure = isPublished || isCancelled;
  const lockContent = isCancelled || pending;
  const lockOther = lockStructure || pending;

  const modeFor = (requested: EventFormMode): EventFormMode => (isPublished ? "draft" : requested);

  const computeErrors = (form: EventFormValues, mode: EventFormMode, formZones: ZoneOption[]): EventFormErrors => {
    const base = getEventFormErrors(form, mode, formZones);
    if (!isPublished) return base;
    const published: EventFormErrors = { ...base };
    if (form.title.trim().length < 3) published.title = "El nombre debe tener al menos 3 caracteres";
    if (form.description.trim().length < MIN_DESCRIPTION) {
      published.description = `La descripción debe tener al menos ${MIN_DESCRIPTION} caracteres`;
    }
    return published;
  };

  const change = (patch: Partial<EventFormValues>, nextZones: ZoneOption[] = zones) => {
    const next = { ...values, ...patch };
    setValues(next);
    // Tras el primer intento, los errores se recalculan en vivo para ver cómo desaparecen.
    if (submittedMode) setErrors(computeErrors(next, submittedMode, nextZones));
  };

  const changeOrganization = (organizationId: string) => {
    if (isEditing) return;
    change({ organizationId, venueId: "", tiers: [] }, []);
  };


  const changeVenue = (venueId: string) => {
    const venue = options.venues.find((item) => item.id === venueId);
    const nextZones = venue?.zones ?? [];
    change({ venueId, tiers: tiersForZones(nextZones) }, nextZones);
  };

  const submit = (requested: EventFormMode) => {
    if (isCancelled || pending) return;
    const mode = modeFor(requested);
    const nextErrors = computeErrors(values, mode, zones);
    setSubmittedMode(mode);
    setErrors(nextErrors);
    setServerError(null);
    if (hasFormErrors(nextErrors)) {
      const invalidId = firstInvalidId(nextErrors);
      if (invalidId) document.getElementById(invalidId)?.focus();
      return;
    }
    setSavingMode(requested);
    const payload = toEventSaveInput(values, mode, zones);
    startTransition(async () => {
      const result = initial
        ? await updateEventAction({ ...payload, id: initial.id })
        : await createEventAction(payload);
      if (!result.ok) {
        setServerError(result.error);
        setSavingMode(null);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      router.push(`/organizer?saved=${mode === "publish" ? "published" : "draft"}`);
    });
  };

  const fromPrice = useMemo(() => {
    const prices = values.tiers
      .filter((tier) => tier.enabled)
      .map((tier) => Number.parseFloat(tier.price))
      .filter((price) => price > 0);
    return prices.length ? Math.min(...prices) : null;
  }, [values.tiers]);

  const actions = (className: string) =>
    isCancelled ? null : (
      <div className={cn("flex gap-3", className)}>
        {isPublished ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => submit("draft")}
            className={cn(buttonVariants({ variant: "cta" }), "h-12 flex-1 rounded-xl text-[0.9375rem]")}
          >
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Guardar cambios
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => submit("draft")}
              className={cn(buttonVariants({ variant: "outline" }), "h-12 flex-1 rounded-xl text-[0.9375rem] font-semibold")}
            >
              {pending && savingMode === "draft" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Guardar borrador
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => submit("publish")}
              className={cn(buttonVariants({ variant: "cta" }), "h-12 flex-1 rounded-xl text-[0.9375rem]")}
            >
              {pending && savingMode === "publish" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Publicar evento
            </button>
          </>
        )}
      </div>
    );

  const summaryItems = submittedMode ? errorSummaryItems(errors) : [];
  const savingText = pending ? (savingMode === "publish" ? "Publicando evento…" : "Guardando…") : "";

  const heading = isCancelled ? "Evento cancelado" : isEditing ? "Editar evento" : "Crear evento";
  const notice = isCancelled ? CANCELLED_NOTICE : isPublished ? PUBLISHED_NOTICE : null;

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="flex flex-col gap-2">
        <Link
          href="/organizer"
          className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Mis eventos
        </Link>
        <h1 className="text-2xl font-bold tracking-tight lg:text-4xl">{heading}</h1>
      </div>

      {notice && (
        <p role="note" className="flex items-start gap-2 rounded-xl border bg-muted px-4 py-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {notice}
        </p>
      )}

      <form
        noValidate
        aria-busy={pending}
        onSubmit={(event) => {
          event.preventDefault();
        }}
        className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8"
      >
        <div className="flex flex-col gap-4 lg:gap-6">
          <Section title="Información básica">
            {hasMultipleOrganizations && (
              <FormField id={fieldId("organizationId")} label="Organización" error={errors.organizationId}>
                <select
                  {...fieldA11yProps(fieldId("organizationId"), errors.organizationId)}
                  value={values.organizationId}
                  disabled={lockOther || isEditing}
                  onChange={(event) => changeOrganization(event.target.value)}
                  className={cn(NATIVE_CONTROL_CLASSES, "h-12 cursor-pointer")}
                >
                  <option value="">Elige una organización</option>
                  {options.organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
              </FormField>
            )}
            <FormField id={fieldId("title")} label="Nombre del evento" error={errors.title}>
              <Input
                {...fieldA11yProps(fieldId("title"), errors.title)}
                type="text"
                placeholder="Ej. Festival de verano 2026"
                value={values.title}
                disabled={lockContent}
                onChange={(event) => change({ title: event.target.value })}
                className={FIELD_INPUT_CLASSES}
              />
            </FormField>
            <FormField id={fieldId("categoryId")} label="Categoría" error={errors.categoryId}>
              <select
                {...fieldA11yProps(fieldId("categoryId"), errors.categoryId)}
                value={values.categoryId}
                disabled={lockOther}
                onChange={(event) => change({ categoryId: event.target.value })}
                className={cn(NATIVE_CONTROL_CLASSES, "h-12 cursor-pointer")}
              >
                <option value="">Elige una categoría</option>
                {options.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id={fieldId("description")} label="Descripción" error={errors.description}>
              <textarea
                {...fieldA11yProps(fieldId("description"), errors.description)}
                rows={4}
                placeholder="Cuenta de qué trata el evento, quiénes se presentan y qué incluye la entrada."
                value={values.description}
                disabled={lockContent}
                onChange={(event) => change({ description: event.target.value })}
                className={cn(NATIVE_CONTROL_CLASSES, "resize-y py-3")}
              />
            </FormField>
          </Section>

          <Section title="Fecha y lugar">
            <div className="grid grid-cols-2 gap-4">
              <FormField id={fieldId("date")} label="Fecha" error={errors.date}>
                <Input
                  {...fieldA11yProps(fieldId("date"), errors.date)}
                  type="date"
                  value={values.date}
                  disabled={lockOther}
                  onChange={(event) => change({ date: event.target.value })}
                  className={FIELD_INPUT_CLASSES}
                />
              </FormField>
              <FormField id={fieldId("time")} label="Hora de inicio" error={errors.time}>
                <Input
                  {...fieldA11yProps(fieldId("time"), errors.time)}
                  type="time"
                  value={values.time}
                  disabled={lockOther}
                  onChange={(event) => change({ time: event.target.value })}
                  className={FIELD_INPUT_CLASSES}
                />
              </FormField>
              <FormField id={fieldId("venueId")} label="Recinto" error={errors.venueId} className="col-span-2">
                <select
                  {...fieldA11yProps(fieldId("venueId"), errors.venueId)}
                  value={values.venueId}
                  disabled={lockOther}
                  onChange={(event) => changeVenue(event.target.value)}
                  className={cn(NATIVE_CONTROL_CLASSES, "h-12 cursor-pointer")}
                >
                  <option value="">Elige un recinto</option>
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name} · {venue.city}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </Section>

          <Section title="Imagen de portada">
            <CoverImageField
              id={fieldId("coverImageUrl")}
              value={values.coverImageUrl}
              error={errors.coverImageUrl}
              disabled={lockContent}
              onChange={(coverImageUrl) => change({ coverImageUrl })}
            />
          </Section>

          <Section title="Tipos de entrada" description="Cada zona del recinto puede tener su precio y su cantidad disponible.">
            {selectedVenue ? (
              <TicketTiersField
                zones={zones}
                tiers={values.tiers}
                errors={errors.tierErrors}
                groupError={errors.tiers}
                disabled={lockOther}
                onChange={(tiers) => change({ tiers })}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Elige un recinto para configurar las entradas de sus zonas.</p>
            )}
          </Section>

          <p role="status" className="sr-only">
            {savingText}
          </p>

          {summaryItems.length > 0 && (
            <section
              aria-labelledby="event-errors-summary"
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-3 text-sm text-destructive"
            >
              <h2 id="event-errors-summary" className="font-semibold">
                Revisa los datos antes de guardar
              </h2>
              <ul className="mt-2 list-disc pl-5">
                {summaryItems.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      onClick={(event) => {
                        event.preventDefault();
                        document.getElementById(item.href.slice(1))?.focus();
                      }}
                      className="underline underline-offset-4"
                    >
                      {item.message}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {serverError && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm break-words text-destructive"
            >
              {serverError}
            </p>
          )}

          {actions("hidden lg:flex lg:justify-end [&>button]:lg:flex-none [&>button]:lg:px-6")}
        </div>

        <aside aria-label="Vista previa" className="flex flex-col gap-3 lg:sticky lg:top-10">
          <span className="text-sm font-semibold text-muted-foreground">Vista previa</span>
          <EventPreviewCard
            title={values.title}
            categoryLabel={selectedCategory?.label ?? null}
            date={values.date}
            time={values.time}
            venueName={selectedVenue?.name ?? null}
            city={selectedVenue?.city ?? null}
            coverImageUrl={values.coverImageUrl || null}
            fromPrice={fromPrice}
          />
          <p className="text-[0.8125rem] text-muted-foreground">Así verán tu evento los compradores en el listado.</p>
        </aside>

        {!isCancelled && <StickyBottomBar>{actions("w-full")}</StickyBottomBar>}
      </form>
    </div>
  );
}

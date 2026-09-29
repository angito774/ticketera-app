"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileQuestion, Loader2 } from "lucide-react";

import { FIELD_INPUT_CLASSES, FormField, fieldA11yProps } from "@/components/form-field";
import { StickyBottomBar } from "@/components/sticky-bottom-bar";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import { EVENT_CATEGORY_LABELS, type EventCategory } from "@/modules/events/types/event.types";
import { CoverImageField } from "@/modules/organizer/components/cover-image-field";
import { EventPreviewCard } from "@/modules/organizer/components/event-preview-card";
import { TicketTiersField, tierFieldId } from "@/modules/organizer/components/ticket-tiers-field";
import {
  EMPTY_EVENT_FORM,
  getEventFormErrors,
  hasFormErrors,
  toFormValues,
  toOrganizerEvent,
  toStartsAt,
  type EventFormErrors,
  type EventFormField,
  type EventFormMode,
  type EventFormValues,
  type TierField,
} from "@/modules/organizer/schemas/event-form.schema";
import { ORGANIZER_EVENTS, mergeOrganizerEvents } from "@/modules/organizer/services/organizer.service";
import { useOrganizerStore } from "@/modules/organizer/store/organizer.store";

interface EventEditorProps {
  /** Sin id: crear evento. Con id: editar ese borrador. */
  eventId?: string;
}

const FIELD_ORDER: EventFormField[] = ["title", "category", "description", "date", "time", "venue", "city"];
const TIER_FIELD_ORDER: TierField[] = ["name", "price", "quantity"];
const fieldId = (field: EventFormField) => `event-${field}`;

const SECTION_CLASSES = "flex flex-col gap-5 rounded-3xl border bg-card p-5 lg:p-7";
const NATIVE_CONTROL_CLASSES =
  "w-full rounded-xl border border-input bg-transparent px-3.5 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-[0.9375rem]";

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
    const tierField = TIER_FIELD_ORDER.find((item) => errors.tierErrors?.[tierIndex][item]);
    if (tierField) return tierFieldId(tierIndex, tierField);
  }
  return null;
}

function EventForm({ id, initialValues, isEditing }: { id: string | null; initialValues: EventFormValues; isEditing: boolean }) {
  const router = useRouter();
  const saveEvent = useOrganizerStore((state) => state.saveEvent);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [submittedMode, setSubmittedMode] = useState<EventFormMode | null>(null);
  const [saving, setSaving] = useState<EventFormMode | null>(null);

  const change = (patch: Partial<EventFormValues>) => {
    const next = { ...values, ...patch };
    setValues(next);
    // Tras el primer intento, los errores se recalculan en vivo para ver cómo desaparecen.
    if (submittedMode) setErrors(getEventFormErrors(next, submittedMode));
  };

  const submit = (mode: EventFormMode) => {
    const nextErrors = getEventFormErrors(values, mode);
    setSubmittedMode(mode);
    setErrors(nextErrors);
    if (hasFormErrors(nextErrors)) {
      const invalidId = firstInvalidId(nextErrors);
      if (invalidId) document.getElementById(invalidId)?.focus();
      return;
    }
    setSaving(mode);
    const status = mode === "publish" ? "published" : "draft";
    saveEvent(toOrganizerEvent(values, status, id ?? `org-${Date.now()}`));
    router.push(`/organizer?saved=${mode === "publish" ? "published" : "draft"}`);
  };

  const fromPrice = useMemo(() => {
    const prices = values.tiers.map((tier) => Number.parseFloat(tier.price)).filter((price) => price > 0);
    return prices.length ? Math.min(...prices) : null;
  }, [values.tiers]);

  const actions = (className: string) => (
    <div className={cn("flex gap-3", className)}>
      <button
        type="button"
        disabled={saving !== null}
        onClick={() => submit("draft")}
        className={cn(buttonVariants({ variant: "outline" }), "h-12 flex-1 rounded-xl text-[0.9375rem] font-semibold")}
      >
        {saving === "draft" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        Guardar borrador
      </button>
      <button
        type="button"
        disabled={saving !== null}
        onClick={() => submit("publish")}
        className={cn(buttonVariants({ variant: "cta" }), "h-12 flex-1 rounded-xl text-[0.9375rem]")}
      >
        {saving === "publish" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        Publicar evento
      </button>
    </div>
  );

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
        <h1 className="text-2xl font-bold tracking-tight lg:text-4xl">{isEditing ? "Editar borrador" : "Crear evento"}</h1>
      </div>

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit("publish");
        }}
        className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8"
      >
        <div className="flex flex-col gap-4 lg:gap-6">
          <Section title="Información básica">
            <FormField id={fieldId("title")} label="Nombre del evento" error={errors.title}>
              <Input
                {...fieldA11yProps(fieldId("title"), errors.title)}
                type="text"
                placeholder="Ej. Festival de verano 2026"
                value={values.title}
                onChange={(event) => change({ title: event.target.value })}
                className={FIELD_INPUT_CLASSES}
              />
            </FormField>
            <FormField id={fieldId("category")} label="Categoría" error={errors.category}>
              <select
                {...fieldA11yProps(fieldId("category"), errors.category)}
                value={values.category}
                onChange={(event) => change({ category: event.target.value as EventCategory | "" })}
                className={cn(NATIVE_CONTROL_CLASSES, "h-12 cursor-pointer")}
              >
                <option value="">Elige una categoría</option>
                {(Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[]).map((category) => (
                  <option key={category} value={category}>
                    {EVENT_CATEGORY_LABELS[category].plural}
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
                  onChange={(event) => change({ date: event.target.value })}
                  className={FIELD_INPUT_CLASSES}
                />
              </FormField>
              <FormField id={fieldId("time")} label="Hora de inicio" error={errors.time}>
                <Input
                  {...fieldA11yProps(fieldId("time"), errors.time)}
                  type="time"
                  value={values.time}
                  onChange={(event) => change({ time: event.target.value })}
                  className={FIELD_INPUT_CLASSES}
                />
              </FormField>
              <FormField id={fieldId("venue")} label="Lugar" error={errors.venue} className="col-span-2 sm:col-span-1">
                <Input
                  {...fieldA11yProps(fieldId("venue"), errors.venue)}
                  type="text"
                  placeholder="Ej. Estadio Nacional"
                  value={values.venue}
                  onChange={(event) => change({ venue: event.target.value })}
                  className={FIELD_INPUT_CLASSES}
                />
              </FormField>
              <FormField id={fieldId("city")} label="Ciudad" error={errors.city} className="col-span-2 sm:col-span-1">
                <Input
                  {...fieldA11yProps(fieldId("city"), errors.city)}
                  type="text"
                  autoComplete="address-level2"
                  placeholder="Ej. Lima"
                  value={values.city}
                  onChange={(event) => change({ city: event.target.value })}
                  className={FIELD_INPUT_CLASSES}
                />
              </FormField>
            </div>
          </Section>

          <Section title="Imagen de portada">
            <CoverImageField value={values.imageUrl} onChange={(imageUrl) => change({ imageUrl })} />
          </Section>

          <Section title="Tipos de entrada" description="Cada tipo tiene su precio y su cantidad disponible.">
            <TicketTiersField
              tiers={values.tiers}
              tierErrors={errors.tierErrors}
              error={errors.tiers}
              onChange={(tiers) => change({ tiers })}
            />
          </Section>

          {actions("hidden lg:flex lg:justify-end [&>button]:lg:flex-none [&>button]:lg:px-6")}
        </div>

        <aside aria-label="Vista previa" className="flex flex-col gap-3 lg:sticky lg:top-10">
          <span className="text-sm font-semibold text-muted-foreground">Vista previa</span>
          <EventPreviewCard
            title={values.title}
            category={values.category}
            startsAt={toStartsAt(values.date, values.time)}
            venue={values.venue}
            city={values.city}
            imageUrl={values.imageUrl}
            fromPrice={fromPrice}
          />
          <p className="text-[0.8125rem] text-muted-foreground">Así verán tu evento los compradores en el listado.</p>
        </aside>

        <StickyBottomBar>{actions("w-full")}</StickyBottomBar>
      </form>
    </div>
  );
}

/** Crear evento o editar un borrador (mock o guardado en el navegador). */
export function EventEditor({ eventId }: EventEditorProps) {
  const hydrated = useHydrated();
  const savedEvents = useOrganizerStore((state) => state.savedEvents);

  if (!eventId) {
    return <EventForm id={null} initialValues={EMPTY_EVENT_FORM} isEditing={false} />;
  }

  if (!hydrated) {
    return <div aria-busy="true" className="min-h-96" />;
  }

  const draft = mergeOrganizerEvents(ORGANIZER_EVENTS, savedEvents).find(
    (event) => event.id === eventId && event.status === "draft"
  );

  if (!draft) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <FileQuestion className="size-10 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-2xl font-bold tracking-tight">No encontramos este borrador</h1>
        <p className="text-muted-foreground">Puede que ya esté publicado o que se haya creado en otro navegador.</p>
        <Link href="/organizer" className={cn(buttonVariants(), "h-11 rounded-xl px-5 text-[0.9375rem]")}>
          Volver al panel
        </Link>
      </div>
    );
  }

  return <EventForm key={draft.id} id={draft.id} initialValues={toFormValues(draft)} isEditing />;
}

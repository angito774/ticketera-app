import { z } from "zod";

import type { EventCategory } from "@/modules/events/types/event.types";
import type { OrganizerEvent, OrganizerEventStatus } from "@/modules/organizer/types/organizer.types";

/** Los eventos se guardan en hora de Lima, igual que el catálogo. */
const LIMA_OFFSET = "-05:00";

export interface TierFormValues {
  name: string;
  price: string;
  quantity: string;
}

export interface EventFormValues {
  title: string;
  category: EventCategory | "";
  description: string;
  /** "2026-12-20" */
  date: string;
  /** "20:00" */
  time: string;
  venue: string;
  city: string;
  /** Vista previa local (`blob:`) o URL de un evento mock; los `blob:` no se persisten. */
  imageUrl: string | null;
  tiers: TierFormValues[];
}

export type EventFormField = "title" | "category" | "description" | "date" | "time" | "venue" | "city" | "tiers";
export type TierField = keyof TierFormValues;

export type EventFormErrors = Partial<Record<EventFormField, string>> & {
  tierErrors?: Partial<Record<TierField, string>>[];
};

export type EventFormMode = "draft" | "publish";

export const EMPTY_TIER: TierFormValues = { name: "", price: "", quantity: "" };

export const EMPTY_EVENT_FORM: EventFormValues = {
  title: "",
  category: "",
  description: "",
  date: "",
  time: "",
  venue: "",
  city: "",
  imageUrl: null,
  tiers: [EMPTY_TIER, EMPTY_TIER],
};

const REQUIRED = "Completa este campo.";

const titleSchema = z.string().trim().min(3, "Ingresa al menos 3 caracteres.");
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha.");
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Elige una hora.");
const priceSchema = z.coerce.number<string>("Ingresa un precio.").positive("El precio debe ser mayor a 0.");
const quantitySchema = z.coerce
  .number<string>("Ingresa una cantidad.")
  .int("Usa un número entero.")
  .positive("La cantidad debe ser mayor a 0.");

const firstError = (schema: z.ZodType, value: unknown): string | undefined => {
  const result = schema.safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
};

/** "2026-12-20" + "20:00" → ISO con offset de Lima; null si falta o es inválida la fecha. */
export function toStartsAt(date: string, time: string): string | null {
  if (!dateSchema.safeParse(date).success) return null;
  const validTime = timeSchema.safeParse(time).success ? time : "00:00";
  const iso = `${date}T${validTime}:00${LIMA_OFFSET}`;
  return Number.isNaN(new Date(iso).getTime()) ? null : iso;
}

const isBlankTier = (tier: TierFormValues) => !tier.name.trim() && !tier.price.trim() && !tier.quantity.trim();

/**
 * Errores del formulario. Un borrador solo exige nombre; publicar exige todo el evento
 * con fecha futura y cada tipo de entrada completo. `now` es inyectable para tests.
 */
export function getEventFormErrors(
  values: EventFormValues,
  mode: EventFormMode,
  now: Date = new Date()
): EventFormErrors {
  const errors: EventFormErrors = {};
  const set = (field: EventFormField, message: string | undefined) => {
    if (message) errors[field] = message;
  };

  set("title", firstError(titleSchema, values.title));
  if (mode === "draft") return errors;

  if (!values.category) set("category", "Elige una categoría.");
  if (values.description.trim().length < 20) set("description", "Describe el evento en al menos 20 caracteres.");
  set("date", firstError(dateSchema, values.date));
  set("time", firstError(timeSchema, values.time));
  if (!errors.date && !errors.time) {
    const startsAt = toStartsAt(values.date, values.time);
    if (!startsAt || new Date(startsAt) <= now) set("date", "La fecha debe ser futura.");
  }
  if (!values.venue.trim()) set("venue", REQUIRED);
  if (!values.city.trim()) set("city", REQUIRED);

  if (values.tiers.length === 0) {
    set("tiers", "Agrega al menos un tipo de entrada.");
    return errors;
  }
  const tierErrors = values.tiers.map((tier) => {
    const tierError: Partial<Record<TierField, string>> = {};
    if (!tier.name.trim()) tierError.name = "Ponle un nombre.";
    const price = firstError(priceSchema, tier.price.trim() || undefined);
    const quantity = firstError(quantitySchema, tier.quantity.trim() || undefined);
    if (price) tierError.price = tier.price.trim() ? price : "Ingresa un precio.";
    if (quantity) tierError.quantity = tier.quantity.trim() ? quantity : "Ingresa una cantidad.";
    return tierError;
  });
  if (tierErrors.some((tierError) => Object.keys(tierError).length > 0)) {
    errors.tierErrors = tierErrors;
  }
  return errors;
}

export function hasFormErrors(errors: EventFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** Valores del formulario → evento del organizador (sin ventas; descarta tipos de entrada vacíos). */
export function toOrganizerEvent(values: EventFormValues, status: OrganizerEventStatus, id: string): OrganizerEvent {
  return {
    id,
    catalogEventId: null,
    status,
    title: values.title.trim(),
    category: values.category || null,
    description: values.description.trim(),
    startsAt: toStartsAt(values.date, values.time),
    venue: values.venue.trim(),
    city: values.city.trim(),
    // Las imágenes locales (blob:) no sobreviven a una recarga: no se guardan.
    imageUrl: values.imageUrl && !values.imageUrl.startsWith("blob:") ? values.imageUrl : null,
    tiers: values.tiers
      .filter((tier) => !isBlankTier(tier))
      .map((tier) => ({
        name: tier.name.trim(),
        price: Number.parseFloat(tier.price) || 0,
        quantity: Number.parseInt(tier.quantity, 10) || 0,
        sold: 0,
      })),
  };
}

/** Evento del organizador → valores del formulario (para editar un borrador). */
export function toFormValues(event: OrganizerEvent): EventFormValues {
  return {
    title: event.title,
    category: event.category ?? "",
    description: event.description,
    // `startsAt` siempre se guarda con offset de Lima: la fecha y hora locales están en el propio string.
    date: event.startsAt?.slice(0, 10) ?? "",
    time: event.startsAt?.slice(11, 16) ?? "",
    venue: event.venue,
    city: event.city,
    imageUrl: event.imageUrl,
    tiers: event.tiers.length
      ? event.tiers.map((tier) => ({
          name: tier.name,
          price: tier.price ? String(tier.price) : "",
          quantity: tier.quantity ? String(tier.quantity) : "",
        }))
      : [EMPTY_TIER],
  };
}

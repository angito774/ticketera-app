import { z } from "zod";

import { ALLOWED_IMAGE_HOSTS, isAllowedImageUrl } from "@/lib/image-hosts";

/** Los eventos se guardan en hora de Lima, igual que el catálogo. */
const LIMA_OFFSET = "-05:00";
const MAX_TIERS = 50;

export interface ZoneOption {
  id: string;
  name: string;
  seating: "general" | "numbered";
  seats: number;
}

export interface TierFormValues {
  zoneId: string;
  enabled: boolean;
  /** Soles, ej. "120.50". */
  price: string;
  /** Solo se pide en zonas generales. */
  quantity: string;
}

export interface EventFormValues {
  title: string;
  categoryId: string;
  description: string;
  /** "2026-12-20" */
  date: string;
  /** "20:00" */
  time: string;
  venueId: string;
  coverImageUrl: string;
  organizationId: string;
  featured: boolean;
  tiers: TierFormValues[];
}

export type EventFormMode = "draft" | "publish";
export type EventFormField =
  | "title"
  | "categoryId"
  | "description"
  | "date"
  | "time"
  | "venueId"
  | "organizationId"
  | "coverImageUrl"
  | "tiers";
export type TierField = "price" | "quantity";

export type EventFormErrors = Partial<Record<EventFormField, string>> & {
  /** Alineado por índice con `values.tiers`. */
  tierErrors?: Partial<Record<TierField, string>>[];
};

export const EMPTY_EVENT_FORM: EventFormValues = {
  title: "",
  categoryId: "",
  description: "",
  date: "",
  time: "",
  venueId: "",
  coverImageUrl: "",
  organizationId: "",
  featured: false,
  tiers: [],
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const MIN_TITLE = 3;
export const MIN_DESCRIPTION = 20;
const MAX_INT = 2_147_483_647;
const PRICE_RE = /^\d+(\.\d{1,2})?$/;
const COVER_ERROR = `Usa una imagen https de un dominio permitido (${ALLOWED_IMAGE_HOSTS.join(", ")}).`;

/** "2026-12-20" + "20:00" → ISO con offset de Lima; null si falta o es inválida la fecha. */
export function toStartsAt(date: string, time: string): string | null {
  const d = date.trim();
  const t = time.trim();
  if (!DATE_RE.test(d)) return null;
  const utc = new Date(`${d}T00:00:00Z`);
  if (Number.isNaN(utc.getTime()) || utc.toISOString().slice(0, 10) !== d) return null;
  const iso = `${d}T${TIME_RE.test(t) ? t : "00:00"}:00${LIMA_OFFSET}`;
  return Number.isNaN(new Date(iso).getTime()) ? null : iso;
}

const parsePriceCents = (price: string): number | null => {
  const text = price.trim();
  return PRICE_RE.test(text) ? Math.round(Number(text) * 100) : null;
};

const parseQuantity = (quantity: string): number | null => {
  const text = quantity.trim();
  return /^\d+$/.test(text) ? Number.parseInt(text, 10) : null;
};

const isGeneral = (zones: ZoneOption[], zoneId: string) =>
  zones.find((zone) => zone.id === zoneId)?.seating === "general";

export function getEventFormErrors(
  values: EventFormValues,
  mode: EventFormMode,
  zones: ZoneOption[]
): EventFormErrors {
  const errors: EventFormErrors = {};

  if (values.title.trim().length < MIN_TITLE) errors.title = "Ingresa al menos 3 caracteres.";
  if (!values.organizationId.trim()) errors.organizationId = "Elige una organización.";

  const cover = values.coverImageUrl.trim();
  if (cover && (cover.length > 500 || !isAllowedImageUrl(cover))) errors.coverImageUrl = COVER_ERROR;

  const publish = mode === "publish";

  if (!values.categoryId.trim()) errors.categoryId = "Elige una categoría.";
  if (!values.venueId.trim()) errors.venueId = "Elige un recinto.";
  if (!DATE_RE.test(values.date.trim())) errors.date = "Elige una fecha.";
  if (!TIME_RE.test(values.time.trim())) errors.time = "Elige una hora.";
  if (!errors.date && !errors.time) {
    const startsAt = toStartsAt(values.date, values.time);
    if (!startsAt) errors.date = "Elige una fecha válida.";
    else if (publish && new Date(startsAt) <= new Date()) errors.date = "La fecha debe ser futura.";
  }

  if (publish) {
    if (values.description.trim().length < MIN_DESCRIPTION) {
      errors.description = "Describe el evento en al menos 20 caracteres.";
    }
    if (!values.tiers.some((tier) => tier.enabled)) {
      errors.tiers = "Habilita al menos un tipo de entrada.";
      return errors;
    }
  }

  const tierErrors = values.tiers.map((tier) => {
    const tierError: Partial<Record<TierField, string>> = {};
    if (!tier.enabled) return tierError;
    const price = tier.price.trim();
    if (!price) {
      if (publish) tierError.price = "Ingresa un precio.";
    } else {
      const cents = parsePriceCents(price);
      if (cents === null || cents > MAX_INT) tierError.price = "Ingresa un precio válido (máximo 2 decimales).";
      else if (publish && cents <= 0) tierError.price = "El precio debe ser mayor a 0.";
    }
    if (isGeneral(zones, tier.zoneId)) {
      const text = tier.quantity.trim();
      if (!text) {
        if (publish) tierError.quantity = "Ingresa una cantidad.";
      } else if (!/^\d+$/.test(text) || Number.parseInt(text, 10) <= 0 || Number.parseInt(text, 10) > MAX_INT) {
        tierError.quantity = "Usa un número entero mayor a 0.";
      }
    }
    return tierError;
  });
  if (tierErrors.some((tierError) => Object.keys(tierError).length > 0)) errors.tierErrors = tierErrors;
  return errors;
}

export function hasFormErrors(errors: EventFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

export interface EventSaveInput {
  mode: EventFormMode;
  organizationId: string;
  title: string;
  categoryId: string | null;
  description: string | null;
  startsAt: string | null;
  venueId: string | null;
  coverImageUrl: string | null;
  featured?: boolean;
  tiers: { zoneId: string; priceCents: number; quantity: number | null }[];
}

/** Valores del formulario → payload serializable para el servidor (solo tiers habilitadas). */
export function toEventSaveInput(values: EventFormValues, mode: EventFormMode, zones: ZoneOption[]): EventSaveInput {
  return {
    mode,
    organizationId: values.organizationId.trim(),
    title: values.title.trim(),
    categoryId: values.categoryId.trim() || null,
    description: values.description.trim() || null,
    startsAt: toStartsAt(values.date, values.time),
    venueId: values.venueId.trim() || null,
    coverImageUrl: values.coverImageUrl.trim() || null,
    featured: values.featured,
    tiers: values.tiers
      .filter((tier) => tier.enabled)
      .map((tier) => ({
        zoneId: tier.zoneId.trim(),
        priceCents: parsePriceCents(tier.price) ?? 0,
        quantity: isGeneral(zones, tier.zoneId) ? parseQuantity(tier.quantity) : null,
      })),
  };
}

const id = z.uuid();
const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => value || null);

const baseSaveSchema = z.object({
  mode: z.enum(["draft", "publish"]),
  organizationId: id,
  title: z.string().trim().min(MIN_TITLE, "Ingresa al menos 3 caracteres.").max(120),
  categoryId: id.nullable(),
  description: nullableText(5000),
  startsAt: z.iso.datetime({ offset: true }).nullable(),
  venueId: id.nullable(),
  coverImageUrl: nullableText(500).refine((value) => value === null || isAllowedImageUrl(value), COVER_ERROR),
  featured: z.boolean().optional(),
  tiers: z
    .array(
      z.object({
        zoneId: id,
        priceCents: z.number().int().min(0).max(MAX_INT),
        quantity: z.number().int().positive().max(MAX_INT).nullable(),
      })
    )
    .max(MAX_TIERS),
});

type SaveShape = z.infer<typeof baseSaveSchema>;

const refineSave = (data: SaveShape, ctx: z.RefinementCtx) => {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });

  const zoneIds = new Set<string>();
  data.tiers.forEach((tier, index) => {
    if (zoneIds.has(tier.zoneId)) issue(["tiers", index, "zoneId"], "Zona duplicada.");
    zoneIds.add(tier.zoneId);
  });

  if (!data.categoryId) issue(["categoryId"], "Elige una categoría.");
  if (!data.venueId) issue(["venueId"], "Elige un recinto.");
  if (!data.startsAt) issue(["startsAt"], "Elige fecha y hora válidas.");

  if (data.mode === "draft") return;

  if (!data.description || data.description.length < MIN_DESCRIPTION) {
    issue(["description"], "Describe el evento en al menos 20 caracteres.");
  }
  if (data.startsAt && new Date(data.startsAt) <= new Date()) issue(["startsAt"], "La fecha debe ser futura.");
  if (data.tiers.length === 0) issue(["tiers"], "Habilita al menos un tipo de entrada.");
  data.tiers.forEach((tier, index) => {
    if (tier.priceCents <= 0) issue(["tiers", index, "priceCents"], "El precio debe ser mayor a 0.");
  });
};

export const eventSaveSchema: z.ZodType<EventSaveInput> = baseSaveSchema.superRefine(refineSave);

export const eventUpdateSchema: z.ZodType<EventSaveInput & { id: string }> = baseSaveSchema
  .extend({ id })
  .superRefine(refineSave);

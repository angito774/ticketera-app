import { z } from "zod";

export const DOCUMENT_TYPES = ["DNI", "CE", "PASSPORT"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  DNI: "DNI",
  CE: "CE",
  PASSPORT: "Pasaporte",
};

export const PAYMENT_METHODS = ["card", "yape", "cash"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card: "Tarjeta",
  yape: "Yape",
  cash: "PagoEfectivo",
};

const DOCUMENT_RULES: Record<DocumentType, { pattern: RegExp; message: string }> = {
  DNI: { pattern: /^\d{8}$/, message: "El DNI tiene 8 dígitos." },
  CE: { pattern: /^\d{9}$/, message: "El CE tiene 9 dígitos." },
  PASSPORT: { pattern: /^[A-Za-z0-9]{6,12}$/, message: "Ingresa entre 6 y 12 letras o números." },
};

const MIN_NAME = "Ingresa al menos 3 caracteres.";

/** "MM/AA" vigente: la tarjeta vale hasta el último día de ese mes. */
export function isCardExpiryValid(expiry: string, now: Date = new Date()): boolean {
  const match = /^(\d{2})\/(\d{2})$/.exec(expiry.trim());
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  const firstDayAfterExpiry = new Date(year, month, 1);
  return firstDayAfterExpiry > now;
}

const baseSchema = z.object({
  fullName: z.string().trim().min(3, MIN_NAME),
  email: z.email("Ingresa un correo válido."),
  documentType: z.enum(DOCUMENT_TYPES),
  documentNumber: z.string().trim(),
  phone: z
    .string()
    .transform((value) => value.replace(/\s/g, ""))
    .pipe(z.string().regex(/^9\d{8}$/, "Ingresa un celular de 9 dígitos que empiece en 9.")),
  paymentMethod: z.enum(PAYMENT_METHODS),
  card: z.object({
    number: z.string(),
    expiry: z.string(),
    cvv: z.string(),
    holder: z.string(),
  }),
  acceptedTerms: z.literal(true, "Acepta los términos para continuar."),
});

type CheckoutInput = z.input<typeof baseSchema>;
type Issue = { path: PropertyKey[]; message: string };

/**
 * Reglas que dependen de otros campos (tipo de documento, método de pago).
 * Se evalúan aparte de `baseSchema` porque `superRefine` no corre si el objeto
 * base es inválido, y el usuario debe ver todos los errores de una vez.
 */
function crossFieldIssues(values: Pick<CheckoutInput, "documentType" | "documentNumber" | "paymentMethod" | "card">, now: Date): Issue[] {
  const issues: Issue[] = [];
  const rule = DOCUMENT_RULES[values.documentType];
  if (rule && !rule.pattern.test(values.documentNumber.trim())) {
    issues.push({ path: ["documentNumber"], message: rule.message });
  }

  if (values.paymentMethod !== "card") return issues;
  const { card } = values;
  if (!/^\d{16}$/.test(card.number.replace(/\s/g, ""))) {
    issues.push({ path: ["card", "number"], message: "Ingresa los 16 dígitos de la tarjeta." });
  }
  if (!isCardExpiryValid(card.expiry, now)) {
    issues.push({ path: ["card", "expiry"], message: "Usa el formato MM/AA y una fecha vigente." });
  }
  if (!/^\d{3,4}$/.test(card.cvv.trim())) {
    issues.push({ path: ["card", "cvv"], message: "El CVV tiene 3 o 4 dígitos." });
  }
  if (card.holder.trim().length < 3) {
    issues.push({ path: ["card", "holder"], message: MIN_NAME });
  }
  return issues;
}

/** Schema completo (para validar un envío de una sola vez). */
export const checkoutSchema = baseSchema.superRefine((values, ctx) => {
  for (const issue of crossFieldIssues(values, new Date())) {
    ctx.addIssue({ code: "custom", ...issue });
  }
});

/** Valores del formulario tal como los edita el usuario (antes de validar). */
export interface CheckoutFormValues {
  fullName: string;
  email: string;
  documentType: DocumentType;
  documentNumber: string;
  phone: string;
  paymentMethod: PaymentMethod;
  card: { number: string; expiry: string; cvv: string; holder: string };
  acceptedTerms: boolean;
}

export type CheckoutField =
  | Exclude<keyof CheckoutFormValues, "card">
  | `card.${keyof CheckoutFormValues["card"]}`;

export type CheckoutFieldErrors = Partial<Record<CheckoutField, string>>;

export const EMPTY_CHECKOUT_VALUES: CheckoutFormValues = {
  fullName: "",
  email: "",
  documentType: "DNI",
  documentNumber: "",
  phone: "",
  paymentMethod: "card",
  card: { number: "", expiry: "", cvv: "", holder: "" },
  acceptedTerms: false,
};

/** Primer mensaje de error por campo ("card.number" para los anidados); vacío si es válido. */
export function getFieldErrors(values: CheckoutFormValues, now: Date = new Date()): CheckoutFieldErrors {
  const result = baseSchema.safeParse(values);
  const issues: Issue[] = [
    ...(result.success ? [] : result.error.issues),
    ...crossFieldIssues(values, now),
  ];

  const errors: CheckoutFieldErrors = {};
  for (const issue of issues) {
    const field = issue.path.map(String).join(".") as CheckoutField;
    errors[field] ??= issue.message;
  }
  return errors;
}

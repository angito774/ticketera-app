import { z } from "zod";

export const DOCUMENT_TYPES = ["DNI", "CE", "PASSPORT"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  DNI: "DNI",
  CE: "CE",
  PASSPORT: "Pasaporte",
};

export const DOCUMENT_RULES: Record<DocumentType, { pattern: RegExp; message: string }> = {
  DNI: { pattern: /^\d{8}$/, message: "El DNI tiene 8 dígitos." },
  CE: { pattern: /^\d{9}$/, message: "El CE tiene 9 dígitos." },
  PASSPORT: { pattern: /^[A-Za-z0-9]{6,12}$/, message: "Ingresa entre 6 y 12 letras o números." },
};

const MIN_NAME = "Ingresa al menos 3 caracteres.";

const baseSchema = z.object({
  fullName: z.string().trim().min(3, MIN_NAME),
  email: z.email("Ingresa un correo válido."),
  documentType: z.enum(DOCUMENT_TYPES),
  documentNumber: z.string().trim(),
  phone: z
    .string()
    .transform((value) => value.replace(/\s/g, ""))
    .pipe(z.string().regex(/^9\d{8}$/, "Ingresa un celular de 9 dígitos que empiece en 9.")),
  acceptedTerms: z.literal(true, "Acepta los términos para continuar."),
});

type CheckoutInput = z.input<typeof baseSchema>;
type Issue = { path: PropertyKey[]; message: string };

/**
 * Reglas que dependen de otros campos (tipo de documento).
 * Se evalúan aparte de `baseSchema` porque `superRefine` no corre si el objeto
 * base es inválido, y el usuario debe ver todos los errores de una vez.
 */
function crossFieldIssues(values: Pick<CheckoutInput, "documentType" | "documentNumber">): Issue[] {
  const issues: Issue[] = [];
  const rule = DOCUMENT_RULES[values.documentType];
  if (rule && !rule.pattern.test(values.documentNumber.trim())) {
    issues.push({ path: ["documentNumber"], message: rule.message });
  }
  return issues;
}

/** Schema completo (para validar un envío de una sola vez). */
export const checkoutSchema = baseSchema.superRefine((values, ctx) => {
  for (const issue of crossFieldIssues(values)) {
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
  acceptedTerms: boolean;
}

export type CheckoutField = keyof CheckoutFormValues;

export type CheckoutFieldErrors = Partial<Record<CheckoutField, string>>;

export const EMPTY_CHECKOUT_VALUES: CheckoutFormValues = {
  fullName: "",
  email: "",
  documentType: "DNI",
  documentNumber: "",
  phone: "",
  acceptedTerms: false,
};

/** Primer mensaje de error por campo; vacío si es válido. */
export function getFieldErrors(values: CheckoutFormValues): CheckoutFieldErrors {
  const result = baseSchema.safeParse(values);
  const issues: Issue[] = [
    ...(result.success ? [] : result.error.issues),
    ...crossFieldIssues(values),
  ];

  const errors: CheckoutFieldErrors = {};
  for (const issue of issues) {
    const field = issue.path.map(String).join(".") as CheckoutField;
    errors[field] ??= issue.message;
  }
  return errors;
}

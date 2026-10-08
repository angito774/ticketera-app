import { z } from "zod";
import { DOCUMENT_RULES, DOCUMENT_TYPES, type DocumentType } from "@/modules/checkout/schemas/checkout.schema";

export const CLAIM_TYPES = ["claim", "complaint"] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];
export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = { claim: "Reclamo", complaint: "Queja" };

export const CLAIM_ITEM_TYPES = ["product", "service"] as const;
export type ClaimItemType = (typeof CLAIM_ITEM_TYPES)[number];
export const CLAIM_ITEM_TYPE_LABELS: Record<ClaimItemType, string> = { product: "Producto", service: "Servicio" };

export const CLAIM_DETAIL_MAX = 2000;
export const CLAIM_REQUEST_MAX = 1000;

export interface ClaimSubmitInput {
  type: ClaimType;
  fullName: string;
  documentType: DocumentType;
  documentNumber: string;
  address: string;
  phone: string;
  email: string;
  isMinor: boolean;
  guardianFullName?: string;
  guardianDocumentType?: DocumentType;
  guardianDocumentNumber?: string;
  itemType: ClaimItemType;
  itemDescription: string;
  claimedAmount?: number;
  orderReference?: string;
  detail: string;
  consumerRequest: string;
  acceptedPrivacy: true;
  website?: string;
}

const MIN_NAME = "Ingresa al menos 3 caracteres.";
const NAME_MAX = 120;
const NAME_MAX_MESSAGE = `Usa como máximo ${NAME_MAX} caracteres.`;
const NUL_MESSAGE = "Quita los caracteres no válidos.";
// Máximo en soles: cabe en la columna integer de centavos (2_147_483_647 / 100).
const CLAIMED_AMOUNT_MAX = 21_000_000;
const TEXT_KEYS = [
  "fullName",
  "documentNumber",
  "address",
  "phone",
  "email",
  "guardianFullName",
  "guardianDocumentNumber",
  "itemDescription",
  "orderReference",
  "detail",
  "consumerRequest",
] as const;
const requiredText = (message: string) => z.string(message).trim();

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = (max: number, message: string) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max, message).optional());

const claimedAmount = z.preprocess(
  (value) => (typeof value === "string" ? emptyToUndefined(value.trim().replace(",", ".")) : value),
  z
    .union([
      z.number("Ingresa un monto válido."),
      z.string().regex(/^\d+(\.\d{1,2})?$/, "Ingresa un monto válido con hasta 2 decimales."),
    ])
    .transform(Number)
    .pipe(
      z
        .number("Ingresa un monto válido.")
        .min(0, "El monto no puede ser negativo.")
        .max(CLAIMED_AMOUNT_MAX, "El monto no puede superar S/ 21,000,000.")
        .refine((n) => Number.isFinite(n) && Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, "Ingresa un monto con hasta 2 decimales."),
    )
    .optional(),
);

const baseSchema = z.object({
  type: z.enum(CLAIM_TYPES, "Selecciona si es un reclamo o una queja."),
  fullName: requiredText("Ingresa tu nombre completo.").min(3, MIN_NAME).max(NAME_MAX, NAME_MAX_MESSAGE),
  documentType: z.enum(DOCUMENT_TYPES, "Selecciona el tipo de documento."),
  documentNumber: requiredText("Ingresa tu número de documento."),
  address: requiredText("Ingresa tu domicilio.")
    .min(5, "Ingresa al menos 5 caracteres.")
    .max(200, "Usa como máximo 200 caracteres."),
  phone: z
    .string("Ingresa tu teléfono.")
    .transform((value) => value.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^\+?\d{7,15}$/, "Ingresa un teléfono de 7 a 15 dígitos.")),
  email: z
    .string("Ingresa tu correo.")
    .trim()
    .toLowerCase()
    .pipe(z.email("Ingresa un correo válido.").max(254, "Usa como máximo 254 caracteres.")),
  isMinor: z.boolean().default(false),
  guardianFullName: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  guardianDocumentType: z.preprocess(emptyToUndefined, z.string().optional()),
  guardianDocumentNumber: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  itemType: z.enum(CLAIM_ITEM_TYPES, "Selecciona si es un producto o un servicio."),
  itemDescription: requiredText("Describe el producto o servicio.")
    .min(3, MIN_NAME)
    .max(300, "Usa como máximo 300 caracteres."),
  claimedAmount,
  orderReference: optionalText(100, "Usa como máximo 100 caracteres."),
  detail: requiredText("Describe el detalle.")
    .min(10, "Ingresa al menos 10 caracteres.")
    .max(CLAIM_DETAIL_MAX, `Usa como máximo ${CLAIM_DETAIL_MAX} caracteres.`),
  consumerRequest: requiredText("Indica tu pedido.")
    .min(10, "Ingresa al menos 10 caracteres.")
    .max(CLAIM_REQUEST_MAX, `Usa como máximo ${CLAIM_REQUEST_MAX} caracteres.`),
  acceptedPrivacy: z.literal(true, "Acepta la política de privacidad para continuar."),
  website: z.string().optional(),
});

type BaseValues = z.output<typeof baseSchema>;

/**
 * Reglas que dependen de otros campos (documento según tipo, apoderado si es menor).
 * Se evalúan aparte de `baseSchema` para que el usuario vea todos los errores a la vez.
 */
function crossFieldIssues(raw: unknown): { path: string; message: string }[] {
  const input = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const text = (key: string) => (typeof input[key] === "string" ? (input[key] as string).trim() : "");
  const issues: { path: string; message: string }[] = [];

  const ruleFor = (type: string) =>
    Object.hasOwn(DOCUMENT_RULES, type) ? DOCUMENT_RULES[type as DocumentType] : undefined;

  for (const key of TEXT_KEYS) {
    if (typeof input[key] === "string" && (input[key] as string).includes("\u0000")) {
      issues.push({ path: key, message: NUL_MESSAGE });
    }
  }

  const rule = ruleFor(text("documentType"));
  if (rule && !rule.pattern.test(text("documentNumber"))) {
    issues.push({ path: "documentNumber", message: rule.message });
  }

  if (input.isMinor === true) {
    if (text("guardianFullName").length < 3) {
      issues.push({ path: "guardianFullName", message: "Ingresa el nombre completo del apoderado." });
    } else if (text("guardianFullName").length > NAME_MAX) {
      issues.push({ path: "guardianFullName", message: NAME_MAX_MESSAGE });
    }
    const guardianRule = ruleFor(text("guardianDocumentType"));
    if (!guardianRule) {
      issues.push({ path: "guardianDocumentType", message: "Selecciona el tipo de documento del apoderado." });
    }
    if (!text("guardianDocumentNumber")) {
      issues.push({ path: "guardianDocumentNumber", message: "Ingresa el número de documento del apoderado." });
    } else if (guardianRule && !guardianRule.pattern.test(text("guardianDocumentNumber"))) {
      issues.push({ path: "guardianDocumentNumber", message: guardianRule.message });
    }
  }
  return issues;
}

function normalize(values: BaseValues): ClaimSubmitInput {
  const { guardianFullName, guardianDocumentType, guardianDocumentNumber, ...rest } = values;
  return {
    ...rest,
    ...(values.isMinor
      ? {
          guardianFullName,
          guardianDocumentType: guardianDocumentType as DocumentType,
          guardianDocumentNumber,
        }
      : {}),
  };
}

/** Entrada del formulario (strings del DOM); `website` es el honeypot. */
export const claimSubmitSchema = z.unknown().transform((raw, ctx): ClaimSubmitInput => {
  const result = baseSchema.safeParse(raw);
  const crossIssues = crossFieldIssues(raw);
  if (result.success && crossIssues.length === 0) return normalize(result.data);

  if (!result.success) {
    for (const issue of result.error.issues) ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
  }
  for (const issue of crossIssues) ctx.addIssue({ code: "custom", path: [issue.path], message: issue.message });
  return z.NEVER;
});

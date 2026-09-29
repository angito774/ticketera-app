import { z } from "zod";

export interface LoginValues {
  email: string;
  password: string;
}

export interface RegisterValues {
  fullName: string;
  email: string;
  password: string;
  acceptedTerms: boolean;
}

type FieldErrors<T> = Partial<Record<keyof T, string>>;

const emailSchema = z.string().trim().pipe(z.email("Ingresa un correo válido."));

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Ingresa tu contraseña."),
});

const registerSchema = z.object({
  fullName: z.string().trim().min(3, "Ingresa al menos 3 caracteres."),
  email: emailSchema,
  password: z
    .string()
    .min(8, "Usa al menos 8 caracteres.")
    .regex(/[A-Za-z]/, "Incluye al menos una letra.")
    .regex(/\d/, "Incluye al menos un número."),
  acceptedTerms: z.literal(true, "Acepta los términos para continuar."),
});

function firstErrors<T>(schema: z.ZodType, values: T): FieldErrors<T> {
  const result = schema.safeParse(values);
  if (result.success) return {};

  const errors: FieldErrors<T> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof T;
    errors[field] ??= issue.message;
  }
  return errors;
}

export function getLoginErrors(values: LoginValues): FieldErrors<LoginValues> {
  return firstErrors(loginSchema, values);
}

export function getRegisterErrors(values: RegisterValues): FieldErrors<RegisterValues> {
  return firstErrors(registerSchema, values);
}

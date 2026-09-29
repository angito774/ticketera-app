import type { RegisterValues } from "@/modules/account/schemas/auth.schema";

export interface User {
  name: string;
  email: string;
}

/**
 * Cuenta de demostración (datos mock, no es autenticación real). Es la única cuenta que
 * verifica contraseña, para poder mostrar el error de credenciales en la UI.
 */
export const DEMO_ACCOUNT: { user: User; password: string } = {
  user: { name: "Ana Quispe", email: "demo@ticketera.pe" },
  password: "ticketera123",
};

export type AuthResult = { ok: true; user: User } | { ok: false; error: string };

export const INVALID_CREDENTIALS = "Correo o contraseña incorrectos.";
export const EMAIL_TAKEN = "Ya existe una cuenta con este correo.";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function authenticate(email: string, password: string, registeredUsers: User[]): AuthResult {
  const normalized = normalizeEmail(email);

  if (normalized === DEMO_ACCOUNT.user.email) {
    return password === DEMO_ACCOUNT.password
      ? { ok: true, user: DEMO_ACCOUNT.user }
      : { ok: false, error: INVALID_CREDENTIALS };
  }

  // Las cuentas creadas no guardan contraseña (mock): basta con que existan.
  const user = registeredUsers.find((item) => item.email === normalized);
  return user ? { ok: true, user } : { ok: false, error: INVALID_CREDENTIALS };
}

export function register(values: RegisterValues, registeredUsers: User[]): AuthResult {
  const email = normalizeEmail(values.email);
  const exists =
    email === DEMO_ACCOUNT.user.email || registeredUsers.some((user) => user.email === email);
  if (exists) return { ok: false, error: EMAIL_TAKEN };

  return { ok: true, user: { name: values.fullName.trim(), email } };
}

/** Solo rutas internas ("/algo", no "//dominio" ni URLs absolutas), para evitar redirecciones abiertas. */
export function safeNextPath(next: string | null | undefined, fallback = "/my-tickets"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/** "Ana Quispe" → "AQ", "ana" → "A" */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

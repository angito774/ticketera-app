import { DEMO_ACCOUNT, normalizeEmail, type User } from "@/modules/account/services/auth.service";

export interface GoogleAccount {
  name: string;
  email: string;
}

/** Cuentas del selector de Google simulado (datos mock: no se conecta con Google). */
export const MOCK_GOOGLE_ACCOUNTS: GoogleAccount[] = [
  { name: DEMO_ACCOUNT.user.name, email: DEMO_ACCOUNT.user.email },
  { name: "María Torres", email: "maria.torres@gmail.com" },
  { name: "Carlos Ruiz", email: "carlos.ruiz@gmail.com" },
];

/**
 * Acceso simulado con Google: si el correo ya tiene cuenta (demo o creada en el navegador)
 * entra con ella; si no, crea una nueva con los datos de la cuenta de Google.
 */
export function signInWithGoogle(
  account: GoogleAccount,
  registeredUsers: User[]
): { user: User; isNew: boolean } {
  const email = normalizeEmail(account.email);
  if (email === DEMO_ACCOUNT.user.email) return { user: DEMO_ACCOUNT.user, isNew: false };

  const existing = registeredUsers.find((user) => user.email === email);
  if (existing) return { user: existing, isNew: false };

  return { user: { name: account.name.trim(), email }, isNew: true };
}

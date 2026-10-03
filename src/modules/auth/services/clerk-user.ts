import type { User } from "@clerk/nextjs/server";
import type { UserJSON } from "@clerk/nextjs/server";

export const DEFAULT_SUPER_ADMIN_EMAIL = "nelson.nc421@gmail.com";

/** Forma común de un usuario de Clerk, venga de la API (`User`) o de un webhook (`UserJSON`). */
export interface ClerkUserFields {
  id: string;
  email: string;
  emailVerified: boolean;
  fullName: string | null;
  avatarUrl: string | null;
  authProviders: string[];
  lastSignInAt: Date | null;
}

export function superAdminEmail(): string {
  return (process.env.SUPER_ADMIN_EMAIL ?? DEFAULT_SUPER_ADMIN_EMAIL)
    .trim()
    .toLowerCase();
}

/** El super admin se reconoce por su correo, y solo si Clerk lo tiene verificado. */
export function isSuperAdminUser(
  user: Pick<ClerkUserFields, "email" | "emailVerified">,
): boolean {
  return user.emailVerified && user.email.toLowerCase() === superAdminEmail();
}

function providerName(provider: string): string {
  return provider.replace(/^oauth_/, "");
}

function joinName(first: string | null, last: string | null): string | null {
  return [first, last].filter(Boolean).join(" ") || null;
}

export function fromClerkUser(user: User): ClerkUserFields | null {
  const primary =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId) ??
    user.emailAddresses[0];
  if (!primary) return null;
  return {
    id: user.id,
    email: primary.emailAddress.toLowerCase(),
    emailVerified: primary.verification?.status === "verified",
    fullName: joinName(user.firstName, user.lastName),
    avatarUrl: user.imageUrl || null,
    authProviders: [
      ...(user.passwordEnabled ? ["password"] : []),
      ...user.externalAccounts.map((a) => providerName(a.provider)),
    ],
    lastSignInAt: user.lastSignInAt ? new Date(user.lastSignInAt) : null,
  };
}

export function fromWebhookUser(user: UserJSON): ClerkUserFields | null {
  const primary =
    user.email_addresses.find((e) => e.id === user.primary_email_address_id) ??
    user.email_addresses[0];
  if (!primary) return null;
  return {
    id: user.id,
    email: primary.email_address.toLowerCase(),
    emailVerified: primary.verification?.status === "verified",
    fullName: joinName(user.first_name, user.last_name),
    avatarUrl: user.image_url || null,
    authProviders: [
      ...(user.password_enabled ? ["password"] : []),
      ...user.external_accounts.map((a) => providerName(a.provider)),
    ],
    lastSignInAt: user.last_sign_in_at ? new Date(user.last_sign_in_at) : null,
  };
}

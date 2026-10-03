import type { UserJSON } from "@clerk/nextjs/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_SUPER_ADMIN_EMAIL,
  fromWebhookUser,
  isSuperAdminUser,
} from "@/modules/auth/services/clerk-user";

function webhookUser(overrides: Partial<UserJSON> = {}): UserJSON {
  return {
    id: "user_1",
    primary_email_address_id: "idn_2",
    email_addresses: [
      { id: "idn_1", email_address: "old@example.com", verification: { status: "unverified" } },
      { id: "idn_2", email_address: "Ana@Example.com", verification: { status: "verified" } },
    ],
    first_name: "Ana",
    last_name: "Pérez",
    image_url: "https://img.clerk.com/a.png",
    password_enabled: true,
    external_accounts: [{ provider: "oauth_google" }],
    last_sign_in_at: 1_700_000_000_000,
    ...overrides,
  } as unknown as UserJSON;
}

afterEach(() => vi.unstubAllEnvs());

describe("fromWebhookUser", () => {
  it("maps the primary email, providers and name", () => {
    expect(fromWebhookUser(webhookUser())).toEqual({
      id: "user_1",
      email: "ana@example.com",
      emailVerified: true,
      fullName: "Ana Pérez",
      avatarUrl: "https://img.clerk.com/a.png",
      authProviders: ["password", "google"],
      lastSignInAt: new Date(1_700_000_000_000),
    });
  });

  it("returns null without an email address", () => {
    expect(fromWebhookUser(webhookUser({ email_addresses: [] }))).toBeNull();
  });
});

describe("isSuperAdminUser", () => {
  it("matches the configured email, case-insensitively, only when verified", () => {
    const email = DEFAULT_SUPER_ADMIN_EMAIL.toUpperCase();
    expect(isSuperAdminUser({ email, emailVerified: true })).toBe(true);
    expect(isSuperAdminUser({ email, emailVerified: false })).toBe(false);
    expect(isSuperAdminUser({ email: "x@example.com", emailVerified: true })).toBe(false);
  });

  it("honours SUPER_ADMIN_EMAIL", () => {
    vi.stubEnv("SUPER_ADMIN_EMAIL", "boss@example.com");
    expect(isSuperAdminUser({ email: "boss@example.com", emailVerified: true })).toBe(true);
    expect(isSuperAdminUser({ email: DEFAULT_SUPER_ADMIN_EMAIL, emailVerified: true })).toBe(false);
  });
});

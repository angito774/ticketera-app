import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  returning: vi.fn(),
  accountsCreate: vi.fn(),
  accountLinksCreate: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    query: { organizations: { findFirst: mocks.findFirst } },
    update: () => ({
      set: () => ({ where: () => ({ returning: mocks.returning }) }),
    }),
  },
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    v2: {
      core: {
        accounts: { create: mocks.accountsCreate },
        accountLinks: { create: mocks.accountLinksCreate },
      },
    },
  }),
}));

import { AdminError } from "@/modules/admin/services/admin.service";
import type { CurrentUser } from "@/modules/auth/services/current-user.service";
import {
  createOnboardingLink,
  ensureConnectedAccount,
} from "@/modules/payments/services/connect.service";

const ORG_ID = "org-1";

function makeUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: "user-1",
    email: "organizer@example.com",
    fullName: "Organizer",
    role: "organizer",
    isSuperAdmin: false,
    memberships: [
      {
        organizationId: ORG_ID,
        roleId: "role-1",
        permissions: ["events:manage"],
      },
    ],
    impersonatedBy: null,
    ...overrides,
  };
}

const org = { id: ORG_ID, name: "Org One", stripeAccountId: null };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("APP_URL", "https://app.test");
  mocks.findFirst.mockResolvedValue(org);
  mocks.accountsCreate.mockResolvedValue({ id: "acct_new" });
  mocks.returning.mockResolvedValue([{ stripeAccountId: "acct_new" }]);
  mocks.accountLinksCreate.mockResolvedValue({ url: "https://stripe.test/onboard" });
});

describe("ensureConnectedAccount", () => {
  it("creates the account with the actor email and an idempotency key", async () => {
    const result = await ensureConnectedAccount(makeUser(), ORG_ID);

    expect(result).toEqual({ accountId: "acct_new" });
    expect(mocks.accountsCreate).toHaveBeenCalledTimes(1);
    const [params, options] = mocks.accountsCreate.mock.calls[0];
    expect(params.contact_email).toBe("organizer@example.com");
    expect(options).toEqual({ idempotencyKey: `connect-account-${ORG_ID}` });
  });

  it("uses the organizer email when the actor is impersonated by a super admin", async () => {
    const actor = makeUser({
      impersonatedBy: { id: "admin-1", email: "admin@example.com", fullName: null },
    });

    await ensureConnectedAccount(actor, ORG_ID);

    expect(mocks.accountsCreate.mock.calls[0][0].contact_email).toBe(
      "organizer@example.com",
    );
  });

  it("reuses the existing account without calling Stripe", async () => {
    mocks.findFirst.mockResolvedValue({ ...org, stripeAccountId: "acct_existing" });

    const result = await ensureConnectedAccount(makeUser(), ORG_ID);

    expect(result).toEqual({ accountId: "acct_existing" });
    expect(mocks.accountsCreate).not.toHaveBeenCalled();
  });

  it("rejects an actor without events:manage on the organization before calling Stripe", async () => {
    const actor = makeUser({
      memberships: [
        { organizationId: "other-org", roleId: "role-1", permissions: ["events:manage"] },
      ],
    });

    await expect(ensureConnectedAccount(actor, ORG_ID)).rejects.toThrow(
      new AdminError("Organización no encontrada"),
    );
    await expect(ensureConnectedAccount(actor, ORG_ID)).rejects.toBeInstanceOf(AdminError);
    expect(mocks.accountsCreate).not.toHaveBeenCalled();
  });
});

describe("createOnboardingLink", () => {
  it("requests refresh and return urls under APP_URL/organizer", async () => {
    const result = await createOnboardingLink(makeUser(), ORG_ID);

    expect(result).toEqual({ url: "https://stripe.test/onboard" });
    expect(mocks.accountLinksCreate).toHaveBeenCalledWith({
      account: "acct_new",
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          refresh_url: "https://app.test/organizer?connect=refresh",
          return_url: "https://app.test/organizer?connect=return",
        },
      },
    });
  });

  it("throws when APP_URL is missing", async () => {
    vi.stubEnv("APP_URL", "");

    await expect(createOnboardingLink(makeUser(), ORG_ID)).rejects.toThrow(
      "APP_URL is not set",
    );
    expect(mocks.accountLinksCreate).not.toHaveBeenCalled();
  });

  it("rejects an unauthorized actor without calling Stripe", async () => {
    const actor = makeUser({ memberships: [] });

    await expect(createOnboardingLink(actor, ORG_ID)).rejects.toBeInstanceOf(AdminError);
    expect(mocks.accountsCreate).not.toHaveBeenCalled();
    expect(mocks.accountLinksCreate).not.toHaveBeenCalled();
  });
});

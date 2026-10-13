import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema";
import { getStripe } from "@/lib/stripe";
import { AdminError } from "@/modules/admin/services/admin.service";
import type { CurrentUser } from "@/modules/auth/services/current-user.service";
import { can } from "@/modules/auth/services/permissions";
import {
  ACCOUNT_INCLUDE,
  buildAccountCreateParams,
  toSnapshot,
} from "@/modules/payments/services/connect-account.adapter";
import { mapConnectStatus } from "@/modules/payments/services/connect-status.mapping";
import type {
  ConnectStatus,
  OrganizationConnectView,
} from "@/modules/payments/types/connect.types";

const NOT_FOUND = "Organización no encontrada";

function requireAppUrl(): string {
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error("APP_URL is not set");
  return appUrl;
}

async function loadManagedOrganization(actor: CurrentUser, organizationId: string) {
  if (!can(actor, "events:manage", organizationId)) throw new AdminError(NOT_FOUND);
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: { id: true, name: true, stripeAccountId: true },
  });
  if (!org) throw new AdminError(NOT_FOUND);
  return org;
}

export async function ensureConnectedAccount(
  actor: CurrentUser,
  organizationId: string,
): Promise<{ accountId: string }> {
  const org = await loadManagedOrganization(actor, organizationId);
  if (org.stripeAccountId) return { accountId: org.stripeAccountId };

  const account = await getStripe().v2.core.accounts.create(
    buildAccountCreateParams({
      displayName: org.name,
      contactEmail: actor.email,
      organizationId: org.id,
    }),
    { idempotencyKey: `connect-account-${org.id}` },
  );

  const [saved] = await db
    .update(organizations)
    .set({ stripeAccountId: account.id, stripeConnectStatus: "pending" })
    .where(and(eq(organizations.id, org.id), isNull(organizations.stripeAccountId)))
    .returning({ stripeAccountId: organizations.stripeAccountId });
  if (saved?.stripeAccountId) return { accountId: saved.stripeAccountId };

  const current = await db.query.organizations.findFirst({
    where: eq(organizations.id, org.id),
    columns: { stripeAccountId: true },
  });
  if (!current?.stripeAccountId) throw new Error("Connected account was not saved");
  return { accountId: current.stripeAccountId };
}

export async function createOnboardingLink(
  actor: CurrentUser,
  organizationId: string,
): Promise<{ url: string }> {
  const { accountId } = await ensureConnectedAccount(actor, organizationId);
  const appUrl = requireAppUrl();
  const link = await getStripe().v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        refresh_url: `${appUrl}/organizer?connect=refresh`,
        return_url: `${appUrl}/organizer?connect=return`,
      },
    },
  });
  return { url: link.url };
}

export async function createAccountSessionSecret(
  actor: CurrentUser,
  organizationId: string,
): Promise<{ clientSecret: string }> {
  const org = await loadManagedOrganization(actor, organizationId);
  if (!org.stripeAccountId) throw new AdminError("Conecta tu cuenta de pagos primero");

  const session = await getStripe().accountSessions.create({
    account: org.stripeAccountId,
    components: {
      notification_banner: { enabled: true },
      account_management: { enabled: true },
    },
  });
  return { clientSecret: session.client_secret };
}

export async function syncConnectStatus(organizationId: string): Promise<ConnectStatus> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: { stripeAccountId: true, stripeConnectStatus: true },
  });
  if (!org) throw new AdminError(NOT_FOUND);
  if (!org.stripeAccountId) return org.stripeConnectStatus;

  const account = await getStripe().v2.core.accounts.retrieve(org.stripeAccountId, {
    include: [...ACCOUNT_INCLUDE],
  });
  const status = mapConnectStatus(toSnapshot(account));
  if (status !== org.stripeConnectStatus) {
    await db
      .update(organizations)
      .set({ stripeConnectStatus: status })
      .where(eq(organizations.id, organizationId));
  }
  return status;
}

export async function listConnectViews(
  actor: CurrentUser,
): Promise<OrganizationConnectView[]> {
  const ids = actor.memberships
    .filter((m) => can(actor, "events:manage", m.organizationId))
    .map((m) => m.organizationId);

  if (!actor.isSuperAdmin && ids.length === 0) return [];

  const rows = await db.query.organizations.findMany({
    where: actor.isSuperAdmin ? undefined : inArray(organizations.id, ids),
    columns: { id: true, name: true, stripeAccountId: true, stripeConnectStatus: true },
    orderBy: organizations.name,
  });

  return rows.map((o) => ({
    organizationId: o.id,
    name: o.name,
    status: o.stripeConnectStatus,
    hasAccount: o.stripeAccountId !== null,
  }));
}

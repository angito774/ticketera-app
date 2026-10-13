import type Stripe from "stripe";

import {
  CONNECTED_ACCOUNT_COUNTRY,
  type ConnectAccountSnapshot,
  type TransfersCapability,
} from "../types/connect.types";

type AccountCreateParams = Stripe.V2.Core.AccountCreateParams;

export const ACCOUNT_INCLUDE = ["configuration.recipient", "requirements"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toCapability(status: unknown): TransfersCapability {
  switch (status) {
    case "active":
      return "active";
    case "pending":
      return "pending";
    case "restricted":
    case "rejected":
      return "restricted";
    case "unsupported":
      return "inactive";
    default:
      return "unknown";
  }
}

function countRequirements(entries: unknown, deadline: string): number {
  if (!Array.isArray(entries)) return 0;
  return entries.filter(
    (entry) =>
      isRecord(entry) &&
      isRecord(entry.minimum_deadline) &&
      entry.minimum_deadline.status === deadline,
  ).length;
}

/** Traduce una cuenta v2 de Stripe (recuperada con `ACCOUNT_INCLUDE`) a nuestro snapshot propio. */
export function toSnapshot(account: unknown): ConnectAccountSnapshot {
  if (!isRecord(account)) {
    return {
      hasAccount: false,
      transfersCapability: "unknown",
      requirementsCurrentlyDue: 0,
      requirementsPastDue: 0,
    };
  }

  const recipient = isRecord(account.configuration) ? account.configuration.recipient : undefined;
  const capabilities = isRecord(recipient) ? recipient.capabilities : undefined;
  const balance = isRecord(capabilities) ? capabilities.stripe_balance : undefined;
  const transfers = isRecord(balance) ? balance.stripe_transfers : undefined;
  const entries = isRecord(account.requirements) ? account.requirements.entries : undefined;

  return {
    hasAccount: true,
    transfersCapability: toCapability(isRecord(transfers) ? transfers.status : undefined),
    requirementsCurrentlyDue: countRequirements(entries, "currently_due"),
    requirementsPastDue: countRequirements(entries, "past_due"),
  };
}

/** Parámetros de creación: Express, plataforma responsable de tarifas y pérdidas, transferencias solicitadas. */
export function buildAccountCreateParams(input: {
  displayName: string;
  contactEmail: string;
  organizationId: string;
}): AccountCreateParams {
  return {
    display_name: input.displayName,
    contact_email: input.contactEmail,
    dashboard: "express",
    identity: { country: CONNECTED_ACCOUNT_COUNTRY },
    defaults: {
      responsibilities: {
        fees_collector: "application",
        losses_collector: "application",
      },
    },
    configuration: {
      recipient: {
        capabilities: { stripe_balance: { stripe_transfers: { requested: true } } },
      },
    },
    include: [...ACCOUNT_INCLUDE],
    metadata: { organizationId: input.organizationId },
  };
}

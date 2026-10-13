import { describe, expect, it } from "vitest";

import { CONNECTED_ACCOUNT_COUNTRY } from "../types/connect.types";
import { buildAccountCreateParams, toSnapshot } from "./connect-account.adapter";

function account(status: string, entries: { status: string }[] = []) {
  return {
    id: "acct_test_123",
    object: "v2.core.account",
    configuration: {
      recipient: {
        applied: true,
        capabilities: { stripe_balance: { stripe_transfers: { status, status_details: [] } } },
      },
    },
    requirements: {
      entries: entries.map((e) => ({
        description: "identity.individual.id_number",
        minimum_deadline: { status: e.status },
      })),
    },
  };
}

describe("toSnapshot", () => {
  it("cuenta activa sin requisitos", () => {
    expect(toSnapshot(account("active"))).toEqual({
      hasAccount: true,
      transfersCapability: "active",
      requirementsCurrentlyDue: 0,
      requirementsPastDue: 0,
    });
  });

  it("cuenta con requisitos vencidos y pendientes", () => {
    const snap = toSnapshot(
      account("restricted", [
        { status: "past_due" },
        { status: "currently_due" },
        { status: "eventually_due" },
      ]),
    );
    expect(snap.transfersCapability).toBe("restricted");
    expect(snap.requirementsPastDue).toBe(1);
    expect(snap.requirementsCurrentlyDue).toBe(1);
  });

  it("capacidad pendiente", () => {
    expect(toSnapshot(account("pending")).transfersCapability).toBe("pending");
  });

  it("rejected se trata como restricted y unsupported como inactive", () => {
    expect(toSnapshot(account("rejected")).transfersCapability).toBe("restricted");
    expect(toSnapshot(account("unsupported")).transfersCapability).toBe("inactive");
  });

  it("respuesta sin configuración ni requisitos", () => {
    expect(toSnapshot({ id: "acct_test_1" })).toEqual({
      hasAccount: true,
      transfersCapability: "unknown",
      requirementsCurrentlyDue: 0,
      requirementsPastDue: 0,
    });
  });

  it("entrada no válida equivale a sin cuenta", () => {
    expect(toSnapshot(null).hasAccount).toBe(false);
    expect(toSnapshot("x").hasAccount).toBe(false);
  });
});

describe("buildAccountCreateParams", () => {
  it("fija Express, responsabilidades de la plataforma, transferencias y país", () => {
    const params = buildAccountCreateParams({
      displayName: "Org Demo",
      contactEmail: "a@b.co",
      organizationId: "org_1",
    });
    expect(params.dashboard).toBe("express");
    expect(params.identity?.country).toBe(CONNECTED_ACCOUNT_COUNTRY);
    expect(params.defaults?.responsibilities).toMatchObject({
      fees_collector: "application",
      losses_collector: "application",
    });
    expect(
      params.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.requested,
    ).toBe(true);
    expect(params.display_name).toBe("Org Demo");
    expect(params.contact_email).toBe("a@b.co");
  });
});

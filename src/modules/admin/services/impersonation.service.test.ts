import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  recordAudit: vi.fn(),
  create: vi.fn(),
  revokeSession: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: { query: { users: { findFirst: mocks.findFirst } } },
}));
vi.mock("@/modules/audit/services/audit.service", () => ({
  recordAudit: mocks.recordAudit,
}));
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({
    actorTokens: { create: mocks.create },
    sessions: { revokeSession: mocks.revokeSession },
  }),
}));

import {
  ACTOR_TOKEN_TTL_SECONDS,
  endImpersonation,
  IMPERSONATION_SESSION_SECONDS,
  ImpersonationError,
  startImpersonation,
} from "@/modules/admin/services/impersonation.service";
import type { CurrentUser } from "@/modules/auth/services/current-user.service";

const actor: CurrentUser = {
  id: "u_super",
  email: "super@x.com",
  fullName: "Super",
  role: "super_admin",
  isSuperAdmin: true,
  memberships: [],
  impersonatedBy: null,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  mocks.findFirst.mockResolvedValue({ id: "u_target", isSuperAdmin: false });
  mocks.recordAudit.mockResolvedValue("audit-id");
  mocks.create.mockResolvedValue({ id: "act_1", url: "https://clerk.test/ticket" });
});

describe("startImpersonation", () => {
  it("expone los TTL acordados", () => {
    expect(ACTOR_TOKEN_TTL_SECONDS).toBe(300);
    expect(IMPERSONATION_SESSION_SECONDS).toBe(1800);
  });

  it("registra el start antes de crear el token y devuelve la url", async () => {
    const order: string[] = [];
    mocks.recordAudit.mockImplementation(async () => {
      order.push("audit");
      return "id";
    });
    mocks.create.mockImplementation(async () => {
      order.push("token");
      return { id: "act_1", url: "https://clerk.test/ticket" };
    });

    await expect(startImpersonation(actor, "u_target")).resolves.toEqual({
      url: "https://clerk.test/ticket",
    });

    expect(order).toEqual(["audit", "token"]);
    expect(mocks.recordAudit).toHaveBeenCalledTimes(1);
    const [user, entry] = mocks.recordAudit.mock.calls[0];
    expect(user).toBe(actor);
    expect(entry).toMatchObject({
      action: "impersonation.start",
      targetId: "u_target",
      result: "ok",
      metadata: { sessionMaxDurationInSeconds: 1800 },
    });
    expect(Number.isNaN(Date.parse(entry.metadata.expiresAt))).toBe(false);
  });

  it("crea el actor token con el super admin real y los TTL 300/1800", async () => {
    await startImpersonation(actor, "u_target");
    expect(mocks.create).toHaveBeenCalledWith({
      userId: "u_target",
      actor: { sub: "u_super" },
      expiresInSeconds: 300,
      sessionMaxDurationInSeconds: 1800,
    });
  });

  it("fail-closed: si el audit lanza, no llama a Clerk", async () => {
    mocks.recordAudit.mockRejectedValue(new Error("db down"));
    await expect(startImpersonation(actor, "u_target")).rejects.toMatchObject({
      name: "ImpersonationError",
      reason: "audit_failed",
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("url nula: segundo start con result error y token_failed", async () => {
    mocks.create.mockResolvedValue({ id: "act_1", url: null });
    await expect(startImpersonation(actor, "u_target")).rejects.toMatchObject({
      reason: "token_failed",
    });
    expect(mocks.recordAudit).toHaveBeenCalledTimes(2);
    expect(mocks.recordAudit.mock.calls[1][1]).toMatchObject({
      action: "impersonation.start",
      result: "error",
      errorCode: "token_failed",
    });
  });

  it("Clerk lanza: registra el error y lanza token_failed", async () => {
    mocks.create.mockRejectedValue(new Error("clerk down"));
    await expect(startImpersonation(actor, "u_target")).rejects.toMatchObject({
      reason: "token_failed",
    });
    expect(mocks.recordAudit.mock.calls[1][1]).toMatchObject({ result: "error" });
  });

  it("denegado: registra impersonation.denied con metadata.reason y no crea token", async () => {
    mocks.findFirst.mockResolvedValue({ id: "u2", isSuperAdmin: true });
    const promise = startImpersonation(actor, "u2");
    await expect(promise).rejects.toBeInstanceOf(ImpersonationError);
    await expect(promise).rejects.toMatchObject({ reason: "target_super_admin" });
    expect(mocks.recordAudit).toHaveBeenCalledTimes(1);
    expect(mocks.recordAudit.mock.calls[0][1]).toMatchObject({
      action: "impersonation.denied",
      result: "denied",
      metadata: { reason: "target_super_admin" },
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("destino inexistente: target_not_found", async () => {
    mocks.findFirst.mockResolvedValue(undefined);
    await expect(startImpersonation(actor, "nope")).rejects.toMatchObject({
      reason: "target_not_found",
    });
  });

  it("denied es fail-open: si el audit falla igual lanza el motivo original", async () => {
    mocks.findFirst.mockResolvedValue(undefined);
    mocks.recordAudit.mockRejectedValue(new Error("db down"));
    await expect(startImpersonation(actor, "nope")).rejects.toMatchObject({
      reason: "target_not_found",
    });
  });
});

describe("endImpersonation", () => {
  const impersonated: CurrentUser = {
    ...actor,
    id: "u_target",
    isSuperAdmin: false,
    impersonatedBy: { id: "u_super", email: "super@x.com", fullName: null },
  };

  it("registra impersonation.end y revoca la sesión", async () => {
    await endImpersonation(impersonated, "sess_1");
    expect(mocks.recordAudit.mock.calls[0][1]).toMatchObject({
      action: "impersonation.end",
      result: "ok",
    });
    expect(mocks.revokeSession).toHaveBeenCalledWith("sess_1");
  });

  it("fail-open: revoca la sesión aunque el audit falle", async () => {
    mocks.recordAudit.mockRejectedValue(new Error("db down"));
    await endImpersonation(impersonated, "sess_1");
    expect(mocks.revokeSession).toHaveBeenCalledWith("sess_1");
  });
});

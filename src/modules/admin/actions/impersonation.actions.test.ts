import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  auth: vi.fn(),
  start: vi.fn(),
  end: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/modules/auth/services/current-user.service", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/modules/admin/services/impersonation.service", async () => {
  class ImpersonationError extends Error {
    constructor(public reason: string) {
      super(reason);
    }
  }
  return {
    ImpersonationError,
    startImpersonation: mocks.start,
    endImpersonation: mocks.end,
  };
});

import { ImpersonationError } from "@/modules/admin/services/impersonation.service";

import {
  endImpersonationAction,
  startImpersonationAction,
} from "./impersonation.actions";

const admin = { id: "admin_1", impersonatedBy: null };
const impersonated = {
  id: "user_2",
  impersonatedBy: { id: "admin_1", email: "a@x.com", fullName: null },
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("startImpersonationAction", () => {
  it("rechaza un id vacío sin consultar la sesión", async () => {
    const result = await startImpersonationAction("");
    expect(result.ok).toBe(false);
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
  });

  it("exige sesión", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const result = await startImpersonationAction("user_2");
    expect(result).toEqual({ ok: false, error: "Inicia sesión para continuar" });
    expect(mocks.start).not.toHaveBeenCalled();
  });

  it("devuelve la url en el caso exitoso", async () => {
    mocks.getCurrentUser.mockResolvedValue(admin);
    mocks.start.mockResolvedValue({ url: "https://clerk/ticket" });
    const result = await startImpersonationAction("user_2");
    expect(result).toEqual({ ok: true, url: "https://clerk/ticket" });
    expect(mocks.start).toHaveBeenCalledWith(admin, "user_2");
  });

  it.each([
    "not_super_admin",
    "self",
    "target_super_admin",
    "nested",
    "target_not_found",
  ])("mapea la denegación %s a un mensaje común", async (reason) => {
    mocks.getCurrentUser.mockResolvedValue(admin);
    mocks.start.mockRejectedValue(new ImpersonationError(reason as never));
    const result = await startImpersonationAction("user_2");
    expect(result).toEqual({
      ok: false,
      error: "No puedes impersonar a este usuario",
    });
  });

  it.each(["audit_failed", "token_failed"])(
    "mapea %s a un mensaje de reintento sin detalles",
    async (reason) => {
      mocks.getCurrentUser.mockResolvedValue(admin);
      mocks.start.mockRejectedValue(new ImpersonationError(reason as never));
      const result = await startImpersonationAction("user_2");
      expect(result).toEqual({
        ok: false,
        error: "No se pudo iniciar la impersonación. Inténtalo de nuevo",
      });
    },
  );

  it("devuelve un mensaje genérico ante errores inesperados", async () => {
    mocks.getCurrentUser.mockResolvedValue(admin);
    mocks.start.mockRejectedValue(new Error("boom secreto"));
    const result = await startImpersonationAction("user_2");
    expect(result).toEqual({
      ok: false,
      error: "Ocurrió un error inesperado. Inténtalo de nuevo",
    });
  });
});

describe("endImpersonationAction", () => {
  it("falla sin sesión", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await endImpersonationAction()).ok).toBe(false);
    expect(mocks.end).not.toHaveBeenCalled();
  });

  it("falla sin impersonación activa", async () => {
    mocks.getCurrentUser.mockResolvedValue(admin);
    expect((await endImpersonationAction()).ok).toBe(false);
    expect(mocks.end).not.toHaveBeenCalled();
  });

  it("termina la sesión actual", async () => {
    mocks.getCurrentUser.mockResolvedValue(impersonated);
    mocks.auth.mockResolvedValue({ sessionId: "sess_1" });
    mocks.end.mockResolvedValue(undefined);
    expect(await endImpersonationAction()).toEqual({ ok: true });
    expect(mocks.end).toHaveBeenCalledWith(impersonated, "sess_1");
  });

  it("devuelve error si falla la revocación", async () => {
    mocks.getCurrentUser.mockResolvedValue(impersonated);
    mocks.auth.mockResolvedValue({ sessionId: "sess_1" });
    mocks.end.mockRejectedValue(new Error("clerk down"));
    expect((await endImpersonationAction()).ok).toBe(false);
  });
});

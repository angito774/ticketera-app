import { beforeEach, describe, expect, it, vi } from "vitest";

const { returning, values, insert } = vi.hoisted(() => {
  const returning = vi.fn();
  const values = vi.fn(() => ({ returning }));
  const insert = vi.fn(() => ({ values }));
  return { returning, values, insert };
});

vi.mock("@/db", () => ({ db: { insert } }));
vi.mock("./redact-input", () => ({
  redactInput: vi.fn((input: unknown) => ({ redacted: input })),
}));

import { adminAuditLog } from "@/db/schema/audit-log";
import type { CurrentUser } from "@/modules/auth/services/current-user.service";
import { auditedAction, recordAudit, safeRecord } from "./audit.service";
import { redactInput } from "./redact-input";

const superAdmin = { id: "u_admin", isSuperAdmin: true } as CurrentUser;
const regular = { id: "u_org", isSuperAdmin: false } as CurrentUser;
const meta = { action: "organization.create", targetType: "organization" };

beforeEach(() => {
  vi.clearAllMocks();
  returning.mockResolvedValue([{ id: "log-1" }]);
});

describe("recordAudit", () => {
  it("returns null and inserts nothing when the actor is not super admin", async () => {
    expect(await recordAudit(regular, { ...meta, result: "ok" })).toBeNull();
    expect(insert).not.toHaveBeenCalled();
  });

  it("inserts the row with the redacted input and returns its id", async () => {
    const id = await recordAudit(superAdmin, {
      ...meta,
      targetId: "o1",
      organizationId: "org-1",
      input: { password: "x" },
      result: "error",
      errorCode: "E1",
    });

    expect(id).toBe("log-1");
    expect(redactInput).toHaveBeenCalledWith({ password: "x" });
    expect(values).toHaveBeenCalledWith({
      actorUserId: "u_admin",
      impersonatedUserId: null,
      action: "organization.create",
      targetType: "organization",
      targetId: "o1",
      organizationId: "org-1",
      input: { redacted: { password: "x" } },
      result: "error",
      errorCode: "E1",
      metadata: null,
    });
  });

  it("passes an org_<uuid> organizationId through unchanged", async () => {
    const organizationId = "org_3f2b8c1e-5d4a-4b7e-9a10-1c2d3e4f5a6b";
    await recordAudit(superAdmin, { ...meta, organizationId, result: "ok" });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ organizationId }));
  });

  it("declares organizationId as a text column (organizations.id is text)", () => {
    expect(adminAuditLog.organizationId.dataType).toBe("string");
    expect(adminAuditLog.organizationId.columnType).toBe("PgText");
  });

  it("attributes the row to the real admin when impersonating, even if the target is not super admin", async () => {
    const impersonating = {
      ...regular,
      impersonatedBy: { id: "u_admin", email: "a@x.com", fullName: "Admin" },
    } as CurrentUser;

    expect(await recordAudit(impersonating, { ...meta, result: "ok" })).toBe("log-1");
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "u_admin", impersonatedUserId: "u_org" }),
    );
  });

  it("throws when the insert fails", async () => {
    returning.mockRejectedValue(new Error("db down"));
    await expect(recordAudit(superAdmin, { ...meta, result: "ok" })).rejects.toThrow("db down");
  });

  it("stores null input without calling redactInput when there is none", async () => {
    await recordAudit(superAdmin, { ...meta, result: "ok" });
    expect(redactInput).not.toHaveBeenCalled();
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ input: null }));
  });
});

describe("safeRecord", () => {
  it("does not throw and logs with console.error when recordAudit fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    returning.mockRejectedValue(new Error("db down"));

    await expect(safeRecord(superAdmin, { ...meta, result: "ok" })).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("records normally when the insert succeeds", async () => {
    await safeRecord(superAdmin, { ...meta, result: "ok" });
    expect(values).toHaveBeenCalledTimes(1);
  });
});

describe("auditedAction", () => {
  it("records ok and returns the same value", async () => {
    const value = { ok: true as const };
    const result = await auditedAction(superAdmin, meta, async () => value);

    expect(result).toBe(value);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ result: "ok", errorCode: null }));
  });

  it("records a domain error result without altering it", async () => {
    const value = { ok: false as const, error: "Nombre duplicado" };
    const result = await auditedAction(superAdmin, meta, async () => value);

    expect(result).toBe(value);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ result: "error", errorCode: "Nombre duplicado" }),
    );
  });

  it("records the error and rethrows the same instance", async () => {
    class BoomError extends Error {
      code = "BOOM";
    }
    const error = new BoomError("boom");

    await expect(
      auditedAction(superAdmin, meta, async () => {
        throw error;
      }),
    ).rejects.toBe(error);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ result: "error", errorCode: "BOOM" }),
    );
  });

  it("falls back to the error name as code", async () => {
    await expect(
      auditedAction(superAdmin, meta, async () => {
        throw new TypeError("x");
      }),
    ).rejects.toThrow(TypeError);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "TypeError" }));
  });

  it("does not insert for non super admins but still returns fn's value", async () => {
    expect(await auditedAction(regular, meta, async () => 42)).toBe(42);
    expect(insert).not.toHaveBeenCalled();
  });

  it("records with the real admin as actor while impersonating", async () => {
    const impersonating = {
      ...regular,
      impersonatedBy: { id: "u_admin", email: "a@x.com", fullName: "Admin" },
    } as CurrentUser;

    expect(await auditedAction(impersonating, meta, async () => 7)).toBe(7);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "u_admin",
        impersonatedUserId: "u_org",
        result: "ok",
      }),
    );
  });

  it("is fail-open when recording fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    returning.mockRejectedValue(new Error("db down"));

    expect(await auditedAction(superAdmin, meta, async () => "done")).toBe("done");
    expect(spy).toHaveBeenCalled();

    const error = new Error("original");
    await expect(
      auditedAction(superAdmin, meta, async () => {
        throw error;
      }),
    ).rejects.toBe(error);
    spy.mockRestore();
  });
});

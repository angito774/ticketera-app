import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  findFirst: vi.fn(),
  upsertUser: vi.fn(),
  syncRoleMetadata: vi.fn(),
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T,>(fn: T) => fn,
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  currentUser: mocks.currentUser,
}));
vi.mock("@/db", () => ({
  db: { query: { users: { findFirst: mocks.findFirst } } },
}));
vi.mock("@/modules/auth/services/user-sync.service", () => ({
  upsertUser: mocks.upsertUser,
  syncRoleMetadata: mocks.syncRoleMetadata,
}));

import { getCurrentUser } from "@/modules/auth/services/current-user.service";

function row(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    email: `${id}@example.com`,
    fullName: `Name ${id}`,
    isSuperAdmin: false,
    memberships: [],
    ...overrides,
  };
}

describe("getCurrentUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  function loadFromMap(map: Record<string, unknown>) {
    const order = Object.keys(map);
    let call = 0;
    mocks.findFirst.mockImplementation(async () => map[order[call++]]);
  }

  it("returns null without a session", async () => {
    mocks.auth.mockResolvedValue({ userId: null, actor: null });
    expect(await getCurrentUser()).toBeNull();
  });

  it("returns impersonatedBy null without an actor", async () => {
    mocks.auth.mockResolvedValue({ userId: "u1", actor: undefined });
    mocks.findFirst.mockResolvedValue(row("u1"));
    const user = await getCurrentUser();
    expect(user).toMatchObject({ id: "u1", impersonatedBy: null });
  });

  describe("impersonated session", () => {
    beforeEach(() => {
      mocks.auth.mockResolvedValue({ userId: "target", actor: { sub: "admin" } });
    });

    it("returns the target with the real actor in impersonatedBy", async () => {
      loadFromMap({
        target: row("target", { email: "t@example.com", fullName: null }),
        admin: row("admin", { isSuperAdmin: true }),
      });
      const user = await getCurrentUser();
      expect(user).toMatchObject({
        id: "target",
        email: "t@example.com",
        isSuperAdmin: false,
        impersonatedBy: {
          id: "admin",
          email: "admin@example.com",
          fullName: "Name admin",
        },
      });
      expect(mocks.currentUser).not.toHaveBeenCalled();
      expect(mocks.upsertUser).not.toHaveBeenCalled();
      expect(mocks.syncRoleMetadata).not.toHaveBeenCalled();
    });

    it("does not promote or sync even for the super admin email", async () => {
      vi.stubEnv("SUPER_ADMIN_EMAIL", "target@example.com");
      loadFromMap({
        target: row("target"),
        admin: row("admin", { isSuperAdmin: true }),
      });
      await getCurrentUser();
      expect(mocks.currentUser).not.toHaveBeenCalled();
      expect(mocks.upsertUser).not.toHaveBeenCalled();
      expect(mocks.syncRoleMetadata).not.toHaveBeenCalled();
      vi.unstubAllEnvs();
    });

    it("returns null when the target is missing", async () => {
      loadFromMap({ target: undefined, admin: row("admin", { isSuperAdmin: true }) });
      expect(await getCurrentUser()).toBeNull();
      expect(mocks.currentUser).not.toHaveBeenCalled();
      expect(mocks.upsertUser).not.toHaveBeenCalled();
    });

    it("returns null when the actor is missing", async () => {
      loadFromMap({ target: row("target"), admin: undefined });
      expect(await getCurrentUser()).toBeNull();
      expect(mocks.upsertUser).not.toHaveBeenCalled();
    });

    it("returns null when the actor is no longer super admin", async () => {
      loadFromMap({ target: row("target"), admin: row("admin") });
      expect(await getCurrentUser()).toBeNull();
    });
  });
});

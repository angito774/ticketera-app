import { describe, expect, it } from "vitest";

import {
  PERMISSION_INFO,
  roleCreateSchema,
  roleDeleteSchema,
  roleInUseMessage,
  roleUpdateSchema,
  samePermissions,
} from "./role.schema";

const valid = {
  id: "box-office",
  name: "Taquilla",
  description: "",
  permissions: ["tickets:redeem"],
};

describe("roleCreateSchema", () => {
  it("accepts a valid role and maps empty description to null", () => {
    const result = roleCreateSchema.parse(valid);
    expect(result.description).toBeNull();
    expect(result.name).toBe("Taquilla");
  });

  it("rejects invalid slugs", () => {
    for (const id of ["a", "Box", "1box", "box office", "x".repeat(33)]) {
      expect(roleCreateSchema.safeParse({ ...valid, id }).success).toBe(false);
    }
  });

  it("validates name length and description max", () => {
    expect(roleCreateSchema.safeParse({ ...valid, name: " a " }).success).toBe(false);
    expect(roleCreateSchema.safeParse({ ...valid, name: "x".repeat(41) }).success).toBe(false);
    expect(
      roleCreateSchema.safeParse({ ...valid, description: "x".repeat(201) }).success,
    ).toBe(false);
  });

  it("rejects empty, unknown and duplicate permissions", () => {
    expect(roleCreateSchema.safeParse({ ...valid, permissions: [] }).success).toBe(false);
    expect(
      roleCreateSchema.safeParse({ ...valid, permissions: ["roles:manage"] }).success,
    ).toBe(false);
    expect(
      roleCreateSchema.safeParse({
        ...valid,
        permissions: ["tickets:redeem", "tickets:redeem"],
      }).success,
    ).toBe(false);
  });
});

describe("roleUpdateSchema", () => {
  it("does not apply the slug regex to the id", () => {
    expect(roleUpdateSchema.safeParse({ ...valid, id: "Legacy_ID" }).success).toBe(true);
    expect(roleUpdateSchema.safeParse({ ...valid, id: "" }).success).toBe(false);
  });
});

describe("roleDeleteSchema", () => {
  it("requires an id", () => {
    expect(roleDeleteSchema.safeParse({ id: "x" }).success).toBe(true);
    expect(roleDeleteSchema.safeParse({ id: "" }).success).toBe(false);
  });
});

describe("samePermissions", () => {
  it("compares as sets, ignoring order", () => {
    expect(samePermissions(["a", "b"], ["b", "a"])).toBe(true);
    expect(samePermissions(["a"], ["a", "b"])).toBe(false);
    expect(samePermissions(["a", "c"], ["a", "b"])).toBe(false);
  });
});

describe("roleInUseMessage", () => {
  it("pluralizes the member count", () => {
    expect(roleInUseMessage(1)).toBe("No se puede eliminar: lo tienen asignado 1 miembro");
    expect(roleInUseMessage(3)).toBe("No se puede eliminar: lo tienen asignado 3 miembros");
  });
});

describe("PERMISSION_INFO", () => {
  it("describes every assignable permission", () => {
    expect(Object.keys(PERMISSION_INFO).sort()).toEqual([
      "events:manage",
      "members:manage",
      "tickets:redeem",
    ]);
  });
});

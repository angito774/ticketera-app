import { describe, expect, it } from "vitest";

import { assignOrganizers } from "./assign-organizers";

const ORGS = ["org_a", "org_b", "org_c"];
const constant = (value: number) => () => value;

describe("assignOrganizers", () => {
  it("respeta las membresías existentes y no crea otra", () => {
    const result = assignOrganizers({
      users: [{ id: "u1", email: "a@x.com", organizationIds: ["org_b"] }],
      organizationIds: ORGS,
      rng: constant(0),
    });
    expect(result.memberships).toEqual([]);
    expect(result.targetOrganizationIds).toEqual(["org_b"]);
    expect(result.assignments).toEqual([{ email: "a@x.com", organizationId: "org_b", created: false }]);
  });

  it("asigna solo a quien no tiene membresía, dentro de la lista", () => {
    const result = assignOrganizers({
      users: [
        { id: "u1", email: "a@x.com", organizationIds: ["org_c"] },
        { id: "u2", email: "b@x.com", organizationIds: [] },
      ],
      organizationIds: ORGS,
      rng: constant(0.5),
    });
    expect(result.memberships).toEqual([{ userId: "u2", organizationId: "org_b" }]);
    expect(ORGS).toContain(result.memberships[0].organizationId);
    expect(result.assignments[1]).toEqual({ email: "b@x.com", organizationId: "org_b", created: true });
  });

  it("no duplica organizaciones destino", () => {
    const result = assignOrganizers({
      users: [
        { id: "u1", email: "a@x.com", organizationIds: [] },
        { id: "u2", email: "b@x.com", organizationIds: [] },
      ],
      organizationIds: ORGS,
      rng: constant(0),
    });
    expect(result.memberships).toHaveLength(2);
    expect(result.targetOrganizationIds).toEqual(["org_a"]);
  });

  it("tolera rng que devuelve 1", () => {
    const result = assignOrganizers({
      users: [{ id: "u1", email: "a@x.com", organizationIds: [] }],
      organizationIds: ORGS,
      rng: constant(1),
    });
    expect(result.memberships[0].organizationId).toBe("org_c");
  });

  it("falla si hay usuarios sin membresía y no hay organizaciones", () => {
    expect(() =>
      assignOrganizers({ users: [{ id: "u1", email: "a@x.com", organizationIds: [] }], organizationIds: [] }),
    ).toThrow();
  });

  it("sin organizaciones pero todos con membresía no falla", () => {
    const result = assignOrganizers({
      users: [{ id: "u1", email: "a@x.com", organizationIds: ["org_a"] }],
      organizationIds: [],
    });
    expect(result.targetOrganizationIds).toEqual(["org_a"]);
  });
});

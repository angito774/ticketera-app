import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { select, selectDistinct, wheres, results } = vi.hoisted(() => {
  const wheres: unknown[] = [];
  const results: unknown[][] = [];

  function chain() {
    const node: Record<string, unknown> = {};
    for (const method of ["from", "innerJoin", "groupBy", "orderBy", "limit"]) {
      node[method] = () => node;
    }
    node.where = (condition: unknown) => {
      wheres.push(condition);
      return node;
    };
    node.then = (resolve: (rows: unknown[]) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(results.shift() ?? []).then(resolve, reject);
    return node;
  }

  return {
    wheres,
    results,
    select: vi.fn(() => chain()),
    selectDistinct: vi.fn(() => chain()),
  };
});

vi.mock("@/db", () => ({ db: { select, selectDistinct } }));

import type { CurrentUser } from "@/modules/auth/services/current-user.service";
import { getDashboardOverview } from "./dashboard.service";

const dialect = new PgDialect();
const now = new Date("2026-10-12T15:00:00Z");

function user(overrides: Partial<CurrentUser>): CurrentUser {
  return {
    id: "u1",
    email: "a@b.c",
    fullName: null,
    role: "admin",
    isSuperAdmin: false,
    memberships: [],
    ...overrides,
  };
}

const manage = (organizationId: string) => ({
  organizationId,
  roleId: "r1",
  permissions: ["members:manage" as const],
});

function rendered(condition: unknown) {
  return dialect.sqlToQuery(condition as SQL);
}

beforeEach(() => {
  wheres.length = 0;
  results.length = 0;
  select.mockClear();
  selectDistinct.mockClear();
});

describe("getDashboardOverview", () => {
  it("admin sin organizaciones devuelve vacío sin consultar ventas", async () => {
    const overview = await getDashboardOverview(
      user({ memberships: [{ organizationId: "org-x", roleId: "r", permissions: ["events:manage"] }] }),
      { period: 7 },
      now,
    );

    expect(select).not.toHaveBeenCalled();
    expect(selectDistinct).not.toHaveBeenCalled();
    expect(overview.isEmpty).toBe(true);
    expect(overview.daily).toHaveLength(7);
    expect(overview.kpis.revenue.value).toBe(0);
    expect(overview.kpis.averageTicket.value).toBeNull();
    expect(overview.topEvents).toEqual([]);
    expect(overview.zones).toEqual([]);
  });

  it("admin con dos organizaciones filtra solo por esas", async () => {
    await getDashboardOverview(
      user({ memberships: [manage("org-a"), manage("org-b")] }),
      { period: 30 },
      now,
    );

    expect(wheres.length).toBeGreaterThan(0);
    const queries = wheres.map(rendered);
    for (const q of queries) {
      expect(q.sql).toMatch(/"events"."organization(_i|I)d" in/);
      expect(q.params).toEqual(expect.arrayContaining(["org-a", "org-b"]));
    }
  });

  it("super admin no aplica filtro de organización", async () => {
    await getDashboardOverview(user({ isSuperAdmin: true, role: "super_admin" }), { period: 30 }, now);

    expect(wheres.length).toBeGreaterThan(0);
    for (const q of wheres.map(rendered)) {
      expect(q.sql).not.toMatch(/organization(_i|I)d/);
      expect(q.sql).toContain('"orders"."status" = $');
      expect(q.params).toContain("paid");
      expect(q.sql).toContain('"events"."status" <> $');
      expect(q.params).toContain("cancelled");
    }
  });

  it("aplica el filtro de categoría a las consultas excepto la lista de categorías y arma el resultado", async () => {
    results.push(
      [
        { date: "2026-10-12", revenueCents: "20000", tickets: "4" },
        { date: "2026-10-05", revenueCents: "10000", tickets: "2" },
      ],
      [{ name: "VIP", tickets: 4 }],
      [{ slug: "musica", label: "Música", revenueCents: 20000 }],
      [
        {
          eventId: "e1",
          title: "Show",
          categoryLabel: "Música",
          city: "Lima",
          tickets: 4,
          revenueCents: 20000,
          sold: 50,
          capacity: 100,
        },
      ],
      [{ sold: 50, capacity: 100 }],
      [{ city: "Lima" }],
      [{ label: "Música" }],
    );

    const overview = await getDashboardOverview(
      user({ isSuperAdmin: true, role: "super_admin" }),
      { period: 7, category: "musica" },
      now,
    );

    const withSlug = wheres.map(rendered).filter((q) => q.params.includes("musica"));
    expect(withSlug).toHaveLength(6);
    expect(overview.kpis.revenue).toEqual({ value: 20000, previous: 10000, deltaPct: 100 });
    expect(overview.kpis.tickets.value).toBe(4);
    expect(overview.kpis.averageTicket.value).toBe(5000);
    expect(overview.kpis.occupancy).toBe(0.5);
    expect(overview.topEvents[0].occupancy).toBe(0.5);
    expect(overview.cityOptions).toEqual(["Lima"]);
    expect(overview.selectedCategoryLabel).toBe("Música");
    expect(overview.isEmpty).toBe(false);
    expect(overview.daily).toHaveLength(7);
  });
});

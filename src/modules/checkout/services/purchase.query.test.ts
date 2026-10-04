import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  addSoldSql,
  buildPurchaseRows,
  claimSeatsSql,
  reserveGeneralSql,
} from "@/modules/checkout/services/purchase.query";

const dialect = new PgDialect();
const flat = (query: string) => query.replace(/\s+/g, " ");

describe("claimSeatsSql", () => {
  it("reclama solo disponibles y exige todos con divisor basado en datos", () => {
    const { sql: text, params } = dialect.sqlToQuery(claimSeatsSql(["a", "b", "c"]));
    expect(flat(text)).toContain("status = 'available'");
    expect(flat(text)).toContain("set status = 'sold'");
    expect(flat(text)).toContain("id in ($1, $2, $3)");
    expect(flat(text)).toContain("select 1 / (select (count(*) = $4)::int from claimed)");
    expect(text).not.toMatch(/1\s*\/\s*0\b/);
    expect(params).toEqual(["a", "b", "c", 3]);
  });
});

describe("reserveGeneralSql", () => {
  it("respeta el cupo y divide por las filas actualizadas", () => {
    const { sql: text, params } = dialect.sqlToQuery(reserveGeneralSql("tt", 2));
    expect(flat(text)).toContain("quantity_sold + $3 <= quantity_total");
    expect(flat(text)).toContain("select 1 / (select count(*)::int from upd)");
    expect(text).not.toMatch(/1\s*\/\s*0\b/);
    expect(params).toEqual([2, "tt", 2]);
  });
});

describe("addSoldSql", () => {
  it("incrementa sin condición de cupo", () => {
    const { sql: text, params } = dialect.sqlToQuery(addSoldSql("tt", 3));
    expect(flat(text)).toContain("quantity_sold = quantity_sold + $1");
    expect(text).not.toContain("quantity_total");
    expect(params).toEqual([3, "tt"]);
  });
});

describe("buildPurchaseRows", () => {
  it("arma orden, ítems y una entrada por unidad", () => {
    let n = 0;
    const rows = buildPurchaseRows({
      orderId: "o",
      userId: "u",
      eventId: "e",
      totalCents: 25000,
      items: [
        { ticketTypeId: "t1", unitPriceCents: 10000, quantity: 2, eventSeatIds: ["s1", "s2"] },
        { ticketTypeId: "t2", unitPriceCents: 5000, quantity: 1, eventSeatIds: [] },
      ],
      newId: () => `id${++n}`,
      newToken: () => `qr${++n}`,
    });
    expect(rows.order).toMatchObject({ id: "o", userId: "u", status: "paid", totalAmount: 25000 });
    expect(rows.orderItems).toHaveLength(2);
    expect(rows.orderItems[0]).toMatchObject({ orderId: "o", quantity: 2, unitPrice: 10000 });
    expect(rows.tickets.map((t) => t.eventSeatId)).toEqual(["s1", "s2", null]);
    expect(new Set(rows.tickets.map((t) => t.qrCode)).size).toBe(3);
    expect(rows.tickets[2].orderItemId).toBe(rows.orderItems[1].id);
  });
});

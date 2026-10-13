import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  addSoldSql,
  buildPurchaseRows,
  buildTicketRows,
  claimSeatsSql,
  releaseHeldQuantitySql,
  releaseSeatsSql,
  releaseSoldSql,
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

describe("claimSeatsSql con estados", () => {
  it("reserva available -> held y confirma held -> sold", () => {
    const reserve = dialect.sqlToQuery(claimSeatsSql(["a"], { from: "available", to: "held" }));
    expect(flat(reserve.sql)).toContain("set status = 'held'");
    expect(flat(reserve.sql)).toContain("status = 'available'");
    const confirm = dialect.sqlToQuery(claimSeatsSql(["a"], { from: "held", to: "sold" }));
    expect(flat(confirm.sql)).toContain("set status = 'sold'");
    expect(flat(confirm.sql)).toContain("status = 'held'");
    expect(confirm.sql).not.toMatch(/1\s*\/\s*0/);
  });
});

describe("liberación", () => {
  it("releaseSeatsSql solo libera asientos held que figuran en los holds de la orden", () => {
    const { sql: text, params } = dialect.sqlToQuery(releaseSeatsSql("o1"));
    expect(flat(text)).toContain("set status = 'available'");
    expect(flat(text)).toContain("status = 'held'");
    expect(flat(text)).toContain("from ticket_holds where order_id = $1");
    expect(params).toEqual(["o1"]);
  });

  it("releaseHeldQuantitySql descuenta lo de los holds (sin holds no resta)", () => {
    const { sql: text, params } = dialect.sqlToQuery(releaseHeldQuantitySql("o1"));
    expect(flat(text)).toContain("quantity_sold = tt.quantity_sold - h.qty");
    expect(flat(text)).toContain("from ticket_holds where order_id = $1 group by ticket_type_id");
    expect(params).toEqual(["o1"]);
  });

  it("releaseSoldSql actúa solo sobre órdenes paid y libera asientos sold", () => {
    const { sql: text, params } = dialect.sqlToQuery(releaseSoldSql("o1"));
    expect(flat(text)).toContain("status = 'paid'");
    expect(flat(text)).toContain("where status = 'sold' and exists (select 1 from o)");
    expect(flat(text)).toContain("quantity_sold = tt.quantity_sold - s.qty");
    expect(params).toEqual(["o1", "o1", "o1"]);
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
  const expiresAt = new Date("2026-01-01T00:30:00Z");

  it("arma orden pending, ítems y holds sin entradas", () => {
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
      expiresAt,
      newId: () => `id${++n}`,
    });
    expect(rows.order).toMatchObject({ id: "o", userId: "u", status: "pending", totalAmount: 25000, expiresAt });
    expect(rows.orderItems).toHaveLength(2);
    expect(rows.orderItems[0]).toMatchObject({ orderId: "o", quantity: 2, unitPrice: 10000 });
    expect(rows.holds).toEqual([
      { ticketTypeId: "t1", eventSeatId: "s1", quantity: 1, userId: "u", orderId: "o", expiresAt },
      { ticketTypeId: "t1", eventSeatId: "s2", quantity: 1, userId: "u", orderId: "o", expiresAt },
      { ticketTypeId: "t2", eventSeatId: null, quantity: 1, userId: "u", orderId: "o", expiresAt },
    ]);
    expect("tickets" in rows).toBe(false);
  });
});

describe("buildTicketRows", () => {
  it("emite una entrada por unidad con asiento en orden y token único", () => {
    let n = 0;
    const tickets = buildTicketRows({
      items: [
        { orderItemId: "i1", ticketTypeId: "t1", quantity: 2, eventSeatIds: ["s1", "s2"] },
        { orderItemId: "i2", ticketTypeId: "t2", quantity: 2, eventSeatIds: [] },
      ],
      newId: () => `id${++n}`,
      newToken: () => `qr${++n}`,
    });
    expect(tickets).toHaveLength(4);
    expect(tickets.map((t) => t.eventSeatId)).toEqual(["s1", "s2", null, null]);
    expect(tickets.map((t) => t.orderItemId)).toEqual(["i1", "i1", "i2", "i2"]);
    expect(new Set(tickets.map((t) => t.qrCode)).size).toBe(4);
    expect(tickets.every((t) => t.status === "valid")).toBe(true);
  });
});

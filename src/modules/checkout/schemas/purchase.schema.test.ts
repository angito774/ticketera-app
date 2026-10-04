import { describe, expect, it } from "vitest";

import { purchaseRequestSchema } from "@/modules/checkout/schemas/purchase.schema";

const valid = {
  eventSlug: "mock-event",
  selection: { quantities: { general: 2 }, seats: { oriente: ["oriente-A-1"] } },
  buyer: { fullName: "  Ana Pérez ", email: "ANA@Example.com" },
  paymentMethod: "yape",
};

const parse = (patch: Record<string, unknown> = {}) =>
  purchaseRequestSchema.safeParse({ ...valid, ...patch });

describe("purchaseRequestSchema", () => {
  it("acepta un payload válido y normaliza textos", () => {
    const result = parse({ eventSlug: "  mock-event " });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.eventSlug).toBe("mock-event");
    expect(result.data.buyer.fullName).toBe("Ana Pérez");
    expect(result.data.buyer.email).toBe("ana@example.com");
    expect(result.data.buyer.documentNumber).toBeUndefined();
    expect(result.data.buyer.phone).toBeUndefined();
  });

  it("trata documento y teléfono vacíos como ausentes y valida los presentes", () => {
    const ok = parse({
      buyer: { ...valid.buyer, documentNumber: " 12345678 ", phone: "987 654 321" },
    });
    expect(ok.success && ok.data.buyer).toMatchObject({
      documentNumber: "12345678",
      phone: "987654321",
    });
    const empty = parse({ buyer: { ...valid.buyer, documentNumber: "", phone: "" } });
    expect(empty.success && empty.data.buyer.phone).toBeUndefined();
    expect(parse({ buyer: { ...valid.buyer, phone: "12345" } }).success).toBe(false);
    expect(parse({ buyer: { ...valid.buyer, documentNumber: "12" } }).success).toBe(false);
  });

  it("rechaza datos del comprador inválidos", () => {
    expect(parse({ buyer: { ...valid.buyer, fullName: "A" } }).success).toBe(false);
    expect(parse({ buyer: { ...valid.buyer, fullName: "x".repeat(81) } }).success).toBe(false);
    expect(parse({ buyer: { ...valid.buyer, email: "nope" } }).success).toBe(false);
  });

  it("rechaza slug vacío o demasiado largo", () => {
    expect(parse({ eventSlug: "   " }).success).toBe(false);
    expect(parse({ eventSlug: "a".repeat(101) }).success).toBe(false);
  });

  it("valida el método de pago", () => {
    for (const method of ["card", "yape", "cash"]) {
      expect(parse({ paymentMethod: method }).success).toBe(true);
    }
    expect(parse({ paymentMethod: "bitcoin" }).success).toBe(false);
  });

  it("no deja pasar datos de tarjeta en el payload", () => {
    const result = parse({ card: { number: "4111111111111111" } });
    expect(result.success && "card" in result.data).toBe(false);
  });

  it("limita cantidades: enteros entre 0 y el máximo", () => {
    const quantities = (value: number) => ({ selection: { quantities: { general: value }, seats: {} } });
    expect(parse(quantities(6)).success).toBe(true);
    expect(parse(quantities(7)).success).toBe(false);
    expect(parse(quantities(-1)).success).toBe(false);
    expect(parse(quantities(1.5)).success).toBe(false);
  });

  it("exige al menos una entrada", () => {
    expect(parse({ selection: { quantities: {}, seats: {} } }).success).toBe(false);
    expect(parse({ selection: { quantities: { general: 0 }, seats: { oriente: [] } } }).success).toBe(false);
  });

  it("rechaza asientos duplicados y listas por encima del máximo", () => {
    const seats = (ids: string[]) => ({ selection: { quantities: {}, seats: { oriente: ids } } });
    expect(parse(seats(["a", "a"])).success).toBe(false);
    expect(parse(seats(["a", "b", "c", "d", "e", "f", "g"])).success).toBe(false);
    expect(parse(seats(["a", "b", "c", "d", "e", "f"])).success).toBe(true);
  });

  it("acota la longitud de claves e ids y el número de zonas", () => {
    const long = "z".repeat(61);
    expect(parse({ selection: { quantities: { [long]: 1 }, seats: {} } }).success).toBe(false);
    expect(parse({ selection: { quantities: {}, seats: { oriente: [long] } } }).success).toBe(false);
    const many = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`z${i}`, 1]));
    expect(parse({ selection: { quantities: many, seats: {} } }).success).toBe(false);
  });
});

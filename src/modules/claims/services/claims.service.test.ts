import { beforeEach, describe, expect, it, vi } from "vitest";

const { returning, values, insert, where, from, select } = vi.hoisted(() => {
  const returning = vi.fn();
  const values = vi.fn(() => ({ returning }));
  const insert = vi.fn(() => ({ values }));
  const where = vi.fn();
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  return { returning, values, insert, where, from, select };
});

vi.mock("@/db", () => ({ db: { insert, select } }));

import { claims } from "@/db/schema";
import type { ClaimSubmitInput } from "../schemas/claim.schema";
import { countRecentClaimsByEmail, createClaim, formatClaimCode } from "./claims.service";

const input: ClaimSubmitInput = {
  type: "claim",
  fullName: "Ana Pérez",
  documentType: "DNI",
  documentNumber: "12345678",
  address: "Av. Siempre Viva 123",
  phone: "987654321",
  email: "ana@mail.com",
  isMinor: false,
  itemType: "service",
  itemDescription: "Entrada al concierto",
  claimedAmount: 120.5,
  detail: "No pude ingresar al evento.",
  consumerRequest: "Solicito la devolución.",
  acceptedPrivacy: true,
};

// 2026-10-10T03:00Z es viernes 2026-10-09 en Lima; +15 días hábiles = 2026-10-30.
const now = new Date("2026-10-10T03:00:00.000Z");
const createdAt = new Date("2026-10-10T03:00:01.000Z");

describe("formatClaimCode", () => {
  it("rellena el número a 6 dígitos", () => {
    expect(formatClaimCode(1, 2026)).toBe("LR-2026-000001");
    expect(formatClaimCode(123456, 2027)).toBe("LR-2027-123456");
  });
});

describe("createClaim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    returning.mockResolvedValue([{ number: 7, createdAt }]);
  });

  it("inserta la fila con fecha límite en Lima y monto en centavos", async () => {
    await createClaim(input, now);

    expect(insert).toHaveBeenCalledWith(claims);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ana@mail.com",
        dueDate: "2026-10-30",
        claimedAmountCents: 12050,
        orderReference: null,
        guardianFullName: null,
      }),
    );
  });

  it("devuelve la constancia con el código del identity y el año de Lima", async () => {
    const receipt = await createClaim(input, now);

    expect(receipt).toMatchObject({
      code: "LR-2026-000007",
      createdAt: createdAt.toISOString(),
      dueDate: "2026-10-30",
      claimedAmountCents: 12050,
      fullName: "Ana Pérez",
    });
  });

  it("usa el año de Lima aunque en UTC ya sea otro año", async () => {
    const receipt = await createClaim(input, new Date("2027-01-01T03:00:00.000Z"));
    expect(receipt.code).toBe("LR-2026-000007");
  });

  it("guarda null sin monto y evita errores de punto flotante", async () => {
    const { claimedAmount: _omit, ...withoutAmount } = input;
    void _omit;
    expect((await createClaim(withoutAmount, now)).claimedAmountCents).toBeNull();

    await createClaim({ ...input, claimedAmount: 1.15 }, now);
    expect(values).toHaveBeenLastCalledWith(expect.objectContaining({ claimedAmountCents: 115 }));
  });

  it("incluye al apoderado solo si es menor de edad", async () => {
    const minor: ClaimSubmitInput = {
      ...input,
      isMinor: true,
      guardianFullName: "Luis Pérez",
      guardianDocumentType: "DNI",
      guardianDocumentNumber: "87654321",
      orderReference: "ORD-1",
    };
    const receipt = await createClaim(minor, now);

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        guardianFullName: "Luis Pérez",
        guardianDocumentType: "DNI",
        guardianDocumentNumber: "87654321",
        orderReference: "ORD-1",
      }),
    );
    expect(receipt).toMatchObject({
      guardianFullName: "Luis Pérez",
      guardianDocumentNumber: "87654321",
      orderReference: "ORD-1",
    });
    expect((await createClaim(input, now)).guardianFullName).toBeUndefined();
  });

  it("propaga errores de base", async () => {
    returning.mockRejectedValue(new Error("db down"));
    await expect(createClaim(input, now)).rejects.toThrow("db down");
  });
});

describe("countRecentClaimsByEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    where.mockResolvedValue([{ total: 2 }]);
  });

  it("cuenta los reclamos del correo y devuelve el total", async () => {
    await expect(countRecentClaimsByEmail("ana@mail.com", now)).resolves.toBe(2);
    expect(select).toHaveBeenCalled();
    expect(from).toHaveBeenCalledWith(claims);
    expect(where).toHaveBeenCalledTimes(1);
  });

  it("devuelve 0 si no hay fila", async () => {
    where.mockResolvedValue([]);
    await expect(countRecentClaimsByEmail("ana@mail.com", now)).resolves.toBe(0);
  });

  it("propaga errores de base", async () => {
    where.mockRejectedValue(new Error("db down"));
    await expect(countRecentClaimsByEmail("ana@mail.com", now)).rejects.toThrow("db down");
  });
});

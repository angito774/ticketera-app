import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClaim, countRecentClaimsByEmail } = vi.hoisted(() => ({
  createClaim: vi.fn(),
  countRecentClaimsByEmail: vi.fn(),
}));

vi.mock("../services/claims.service", () => ({ createClaim, countRecentClaimsByEmail }));

import { submitClaimAction } from "./claims.actions";

const valid = {
  type: "claim",
  fullName: "Ana Pérez",
  documentType: "DNI",
  documentNumber: "12345678",
  address: "Av. Siempre Viva 123",
  phone: "987 654 321",
  email: " Ana@Mail.COM ",
  isMinor: false,
  itemType: "service",
  itemDescription: "Entrada al concierto",
  claimedAmount: "120.50",
  orderReference: "",
  detail: "No pude ingresar al evento.",
  consumerRequest: "Solicito la devolución.",
  acceptedPrivacy: true,
  website: "",
};

const receipt = { code: "LR-2026-000001" };

describe("submitClaimAction", () => {
  beforeEach(() => {
    createClaim.mockReset();
    countRecentClaimsByEmail.mockReset();
    createClaim.mockResolvedValue(receipt);
    countRecentClaimsByEmail.mockResolvedValue(0);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("rechaza el honeypot sin llamar al service", async () => {
    const result = await submitClaimAction({ ...valid, website: "http://spam.com" });

    expect(result).toEqual({
      ok: false,
      error: "No pudimos registrar tu reclamo. Inténtalo de nuevo más tarde.",
    });
    expect(countRecentClaimsByEmail).not.toHaveBeenCalled();
    expect(createClaim).not.toHaveBeenCalled();
  });

  it("devuelve el primer error y el mapa de errores por campo", async () => {
    const result = await submitClaimAction({ ...valid, fullName: "", documentNumber: "1" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe(Object.values(result.fieldErrors ?? {})[0]);
    expect(result.fieldErrors).toMatchObject({
      fullName: expect.any(String),
      documentNumber: expect.any(String),
    });
    expect(createClaim).not.toHaveBeenCalled();
  });

  it("rechaza una entrada que no es objeto", async () => {
    const result = await submitClaimAction(null);
    expect(result.ok).toBe(false);
    expect(createClaim).not.toHaveBeenCalled();
  });

  it("aplica el tope por correo sin insertar", async () => {
    countRecentClaimsByEmail.mockResolvedValue(3);

    const result = await submitClaimAction(valid);

    expect(result).toEqual({
      ok: false,
      error: "Ya registraste varios reclamos hoy con este correo. Inténtalo de nuevo mañana.",
    });
    expect(countRecentClaimsByEmail).toHaveBeenCalledWith("ana@mail.com");
    expect(createClaim).not.toHaveBeenCalled();
  });

  it("registra con los datos normalizados y devuelve la constancia", async () => {
    countRecentClaimsByEmail.mockResolvedValue(2);

    await expect(submitClaimAction(valid)).resolves.toEqual({ ok: true, receipt });
    expect(createClaim).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ana@mail.com", phone: "987654321", claimedAmount: 120.5 }),
    );
  });

  it("no filtra detalles cuando falla la base", async () => {
    createClaim.mockRejectedValue(new Error("connection string secret"));

    const result = await submitClaimAction(valid);

    expect(result).toEqual({
      ok: false,
      error: "No pudimos registrar tu reclamo. Inténtalo de nuevo más tarde.",
    });
    expect(console.error).toHaveBeenCalled();
  });

  it("no registra datos personales al fallar la base", async () => {
    const sql = `Failed query: insert into "claims" values ($1, $2, $3)\nparams: Ana Pérez,12345678,ana@mail.com`;
    const failure = new Error(sql, { cause: Object.assign(new Error("dup ana@mail.com"), { code: "23505" }) });
    failure.name = "DrizzleQueryError";
    createClaim.mockRejectedValue(failure);

    const result = await submitClaimAction(valid);

    expect(result).toEqual({
      ok: false,
      error: "No pudimos registrar tu reclamo. Inténtalo de nuevo más tarde.",
    });
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    for (const personal of ["ana@mail.com", "12345678", "Ana", "Pérez", "params", "Failed query"]) {
      expect(logged).not.toContain(personal);
    }
    expect(logged).toContain("23505");

    countRecentClaimsByEmail.mockRejectedValue(failure);
    vi.mocked(console.error).mockClear();
    await submitClaimAction(valid);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("ana@mail.com");
  });

  it.each(["constructor", "toString", "__proto__", "hasOwnProperty"])(
    "documentType %s devuelve errores de campo sin lanzar",
    async (key) => {
      const result = await submitClaimAction({ ...valid, documentType: key });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.fieldErrors?.documentType).toEqual(expect.any(String));
      expect(createClaim).not.toHaveBeenCalled();
    },
  );

  it.each(["constructor", "toString", "__proto__", "hasOwnProperty"])(
    "guardianDocumentType %s devuelve errores de campo sin lanzar",
    async (key) => {
      const result = await submitClaimAction({
        ...valid,
        isMinor: true,
        guardianFullName: "Luis Pérez",
        guardianDocumentType: key,
        guardianDocumentNumber: "87654321",
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.fieldErrors?.guardianDocumentType).toEqual(expect.any(String));
    },
  );

  it("también oculta el error si falla el conteo", async () => {
    countRecentClaimsByEmail.mockRejectedValue(new Error("secret"));

    const result = await submitClaimAction(valid);

    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(createClaim).not.toHaveBeenCalled();
  });
});

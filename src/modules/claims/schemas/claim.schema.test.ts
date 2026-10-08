import { describe, expect, it } from "vitest";
import { CLAIM_ITEM_TYPE_LABELS, CLAIM_TYPE_LABELS, claimSubmitSchema } from "./claim.schema";

const valid = {
  type: "claim",
  fullName: "  Ana Pérez  ",
  documentType: "DNI",
  documentNumber: "12345678",
  address: "Av. Siempre Viva 742",
  phone: "+51 987 654 321",
  email: "  Ana@Example.COM ",
  isMinor: false,
  itemType: "service",
  itemDescription: "Entrada concierto",
  detail: "No pude ingresar al evento.",
  consumerRequest: "Solicito la devolución.",
  acceptedPrivacy: true,
  website: "",
};

function errorsOf(input: unknown): Record<string, string> {
  const result = claimSubmitSchema.safeParse(input);
  if (result.success) return {};
  const map: Record<string, string> = {};
  for (const issue of result.error.issues) map[issue.path.join(".")] ??= issue.message;
  return map;
}

describe("claimSubmitSchema", () => {
  it("acepta una hoja válida y normaliza", () => {
    const result = claimSubmitSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.fullName).toBe("Ana Pérez");
    expect(result.data.email).toBe("ana@example.com");
    expect(result.data.phone).toBe("+51987654321");
    expect(result.data.claimedAmount).toBeUndefined();
    expect(result.data.orderReference).toBeUndefined();
    expect(result.data.guardianFullName).toBeUndefined();
  });

  it("expone etiquetas de tipo", () => {
    expect(CLAIM_TYPE_LABELS.complaint).toBe("Queja");
    expect(CLAIM_ITEM_TYPE_LABELS.product).toBe("Producto");
  });

  it("valida tipo de reclamo y de bien", () => {
    expect(errorsOf({ ...valid, type: "other" }).type).toBeDefined();
    expect(errorsOf({ ...valid, type: "complaint" }).type).toBeUndefined();
    expect(errorsOf({ ...valid, itemType: "other" }).itemType).toBeDefined();
    expect(errorsOf({ ...valid, itemType: "product" }).itemType).toBeUndefined();
  });

  it("exige nombre de al menos 3 caracteres tras recortar", () => {
    expect(errorsOf({ ...valid, fullName: " ab " }).fullName).toBeDefined();
    expect(errorsOf({ ...valid, fullName: "" }).fullName).toBeDefined();
  });

  describe("documento según tipo", () => {
    it("DNI: 8 dígitos", () => {
      expect(errorsOf({ ...valid, documentNumber: "1234567" }).documentNumber).toBe("El DNI tiene 8 dígitos.");
      expect(errorsOf({ ...valid, documentNumber: "" }).documentNumber).toBeDefined();
    });
    it("CE: 9 dígitos", () => {
      const ce = { ...valid, documentType: "CE" };
      expect(errorsOf({ ...ce, documentNumber: "123456789" }).documentNumber).toBeUndefined();
      expect(errorsOf({ ...ce, documentNumber: "12345678" }).documentNumber).toBe("El CE tiene 9 dígitos.");
    });
    it("Pasaporte: 6 a 12 alfanuméricos", () => {
      const pp = { ...valid, documentType: "PASSPORT" };
      expect(errorsOf({ ...pp, documentNumber: "AB1234" }).documentNumber).toBeUndefined();
      expect(errorsOf({ ...pp, documentNumber: "AB123" }).documentNumber).toBeDefined();
      expect(errorsOf({ ...pp, documentNumber: "AB1234567890X" }).documentNumber).toBeDefined();
    });
    it("rechaza un tipo de documento desconocido", () => {
      expect(errorsOf({ ...valid, documentType: "RUC" }).documentType).toBeDefined();
    });
  });

  it("valida domicilio (5 a 200)", () => {
    expect(errorsOf({ ...valid, address: "abcd" }).address).toBeDefined();
    expect(errorsOf({ ...valid, address: "a".repeat(201) }).address).toBeDefined();
    expect(errorsOf({ ...valid, address: "a".repeat(200) }).address).toBeUndefined();
  });

  it("valida teléfono (7 a 15 dígitos, + y espacios)", () => {
    expect(errorsOf({ ...valid, phone: "123456" }).phone).toBeDefined();
    expect(errorsOf({ ...valid, phone: "1234567" }).phone).toBeUndefined();
    expect(errorsOf({ ...valid, phone: "1".repeat(15) }).phone).toBeUndefined();
    expect(errorsOf({ ...valid, phone: "1".repeat(16) }).phone).toBeDefined();
    expect(errorsOf({ ...valid, phone: "98a654321" }).phone).toBeDefined();
  });

  it("valida correo y largo máximo de 254", () => {
    expect(errorsOf({ ...valid, email: "no-es-correo" }).email).toBeDefined();
    expect(errorsOf({ ...valid, email: `${"a".repeat(250)}@example.com` }).email).toBeDefined();
  });

  it("valida descripción del bien (3 a 300)", () => {
    expect(errorsOf({ ...valid, itemDescription: "ab" }).itemDescription).toBeDefined();
    expect(errorsOf({ ...valid, itemDescription: "a".repeat(301) }).itemDescription).toBeDefined();
    expect(errorsOf({ ...valid, itemDescription: "a".repeat(300) }).itemDescription).toBeUndefined();
  });

  describe("monto reclamado", () => {
    const amount = (claimedAmount: unknown) => claimSubmitSchema.safeParse({ ...valid, claimedAmount });

    it("es opcional", () => {
      expect(amount(undefined).success).toBe(true);
      expect(amount("").success).toBe(true);
      expect(amount("  ").success).toBe(true);
    });
    it("convierte strings y números a número", () => {
      expect(amount("150.5")).toMatchObject({ success: true, data: { claimedAmount: 150.5 } });
      expect(amount("150,50")).toMatchObject({ success: true, data: { claimedAmount: 150.5 } });
      expect(amount(0)).toMatchObject({ success: true, data: { claimedAmount: 0 } });
      expect(amount(20)).toMatchObject({ success: true, data: { claimedAmount: 20 } });
    });
    it("rechaza negativos, más de 2 decimales y no numéricos", () => {
      expect(amount("-1").success).toBe(false);
      expect(amount(-1).success).toBe(false);
      expect(amount("10.123").success).toBe(false);
      expect(amount(10.123).success).toBe(false);
      expect(amount("abc").success).toBe(false);
      expect(amount(Number.NaN).success).toBe(false);
    });
  });

  it("orderReference: opcional, máx. 100", () => {
    expect(errorsOf({ ...valid, orderReference: "a".repeat(101) }).orderReference).toBeDefined();
    const ok = claimSubmitSchema.safeParse({ ...valid, orderReference: " ORD-1 " });
    expect(ok).toMatchObject({ success: true, data: { orderReference: "ORD-1" } });
  });

  it("detail: mín. 10, máx. 2000", () => {
    expect(errorsOf({ ...valid, detail: "corto" }).detail).toBeDefined();
    expect(errorsOf({ ...valid, detail: "a".repeat(2000) }).detail).toBeUndefined();
    expect(errorsOf({ ...valid, detail: "a".repeat(2001) }).detail).toBeDefined();
  });

  it("consumerRequest: mín. 10, máx. 1000", () => {
    expect(errorsOf({ ...valid, consumerRequest: "corto" }).consumerRequest).toBeDefined();
    expect(errorsOf({ ...valid, consumerRequest: "a".repeat(1000) }).consumerRequest).toBeUndefined();
    expect(errorsOf({ ...valid, consumerRequest: "a".repeat(1001) }).consumerRequest).toBeDefined();
  });

  it("acceptedPrivacy debe ser true", () => {
    expect(errorsOf({ ...valid, acceptedPrivacy: false }).acceptedPrivacy).toBeDefined();
    expect(errorsOf({ ...valid, acceptedPrivacy: undefined }).acceptedPrivacy).toBeDefined();
  });

  it("conserva el honeypot para que la action lo evalúe", () => {
    expect(claimSubmitSchema.safeParse({ ...valid, website: "spam.com" })).toMatchObject({
      success: true,
      data: { website: "spam.com" },
    });
  });

  describe("menor de edad", () => {
    const minor = { ...valid, isMinor: true };

    it("exige los datos del apoderado", () => {
      const errors = errorsOf(minor);
      expect(errors.guardianFullName).toBeDefined();
      expect(errors.guardianDocumentType).toBeDefined();
      expect(errors.guardianDocumentNumber).toBeDefined();
    });

    it("valida el documento del apoderado según su tipo", () => {
      const errors = errorsOf({
        ...minor,
        guardianFullName: "Luis Pérez",
        guardianDocumentType: "CE",
        guardianDocumentNumber: "123",
      });
      expect(errors.guardianDocumentNumber).toBe("El CE tiene 9 dígitos.");
      expect(errors.guardianFullName).toBeUndefined();
    });

    it("acepta apoderado completo", () => {
      const result = claimSubmitSchema.safeParse({
        ...minor,
        guardianFullName: " Luis Pérez ",
        guardianDocumentType: "DNI",
        guardianDocumentNumber: "87654321",
      });
      expect(result).toMatchObject({
        success: true,
        data: {
          isMinor: true,
          guardianFullName: "Luis Pérez",
          guardianDocumentType: "DNI",
          guardianDocumentNumber: "87654321",
        },
      });
    });

    it("ignora el apoderado si no es menor, aunque venga inválido", () => {
      const result = claimSubmitSchema.safeParse({
        ...valid,
        guardianFullName: "x",
        guardianDocumentType: "DNI",
        guardianDocumentNumber: "1",
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.guardianFullName).toBeUndefined();
      expect(result.data.guardianDocumentType).toBeUndefined();
      expect(result.data.guardianDocumentNumber).toBeUndefined();
    });
  });

  it("informa todos los errores a la vez", () => {
    const errors = errorsOf({
      ...valid,
      email: "mal",
      documentNumber: "1",
      detail: "x",
      isMinor: true,
    });
    expect(Object.keys(errors)).toEqual(
      expect.arrayContaining(["email", "documentNumber", "detail", "guardianFullName", "guardianDocumentNumber"]),
    );
  });

  describe("claves del prototipo como tipo de documento", () => {
    const keys = ["constructor", "toString", "__proto__", "hasOwnProperty"];

    it.each(keys)("documentType %s no lanza y da error de campo", (key) => {
      const input = { ...valid, documentType: key };
      expect(() => claimSubmitSchema.safeParse(input)).not.toThrow();
      expect(errorsOf(input).documentType).toBeDefined();
    });

    it.each(keys)("guardianDocumentType %s no lanza y da error de campo", (key) => {
      const input = {
        ...valid,
        isMinor: true,
        guardianFullName: "Luis Pérez",
        guardianDocumentType: key,
        guardianDocumentNumber: "87654321",
      };
      expect(() => claimSubmitSchema.safeParse(input)).not.toThrow();
      expect(errorsOf(input).guardianDocumentType).toBeDefined();
    });
  });

  describe("endurecimiento", () => {
    it("fullName máx. 120", () => {
      expect(errorsOf({ ...valid, fullName: "a".repeat(120) }).fullName).toBeUndefined();
      expect(errorsOf({ ...valid, fullName: "a".repeat(121) }).fullName).toBe("Usa como máximo 120 caracteres.");
    });

    it("guardianFullName máx. 120", () => {
      const minor = {
        ...valid,
        isMinor: true,
        guardianDocumentType: "DNI",
        guardianDocumentNumber: "87654321",
      };
      expect(errorsOf({ ...minor, guardianFullName: "a".repeat(120) }).guardianFullName).toBeUndefined();
      expect(errorsOf({ ...minor, guardianFullName: "a".repeat(121) }).guardianFullName).toBe(
        "Usa como máximo 120 caracteres.",
      );
    });

    it("claimedAmount máx. 21,000,000", () => {
      const amount = (claimedAmount: unknown) => claimSubmitSchema.safeParse({ ...valid, claimedAmount });
      expect(amount(21_000_000).success).toBe(true);
      expect(amount("21000000.00").success).toBe(true);
      expect(amount(21_000_000.01).success).toBe(false);
      expect(amount("99999999999").success).toBe(false);
    });

    it("rechaza el carácter NUL en todos los campos de texto", () => {
      const nul = "ab\u0000cdefghij";
      for (const key of [
        "fullName",
        "documentNumber",
        "address",
        "phone",
        "email",
        "itemDescription",
        "orderReference",
        "detail",
        "consumerRequest",
      ]) {
        expect(errorsOf({ ...valid, [key]: nul })[key], key).toBeDefined();
      }
      expect(errorsOf({ ...valid, detail: nul }).detail).toBe("Quita los caracteres no válidos.");
      const minor = {
        ...valid,
        isMinor: true,
        guardianFullName: "Luis\u0000 Pérez",
        guardianDocumentType: "DNI",
        guardianDocumentNumber: "87654321",
      };
      expect(errorsOf(minor).guardianFullName).toBe("Quita los caracteres no válidos.");
      expect(errorsOf({ ...minor, guardianFullName: "Luis Pérez", guardianDocumentNumber: "8765\u00004321" }).guardianDocumentNumber).toBeDefined();
    });
  });

  it("rechaza entradas que no son objeto sin lanzar", () => {
    expect(claimSubmitSchema.safeParse(null).success).toBe(false);
    expect(claimSubmitSchema.safeParse("x").success).toBe(false);
  });
});

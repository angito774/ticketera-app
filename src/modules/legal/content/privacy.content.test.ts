import { describe, expect, it } from "vitest";

import { LEGAL_CONFIG } from "@/modules/legal/content/legal-config";
import { buildPrivacyDocument, PRIVACY_DOCUMENT } from "@/modules/legal/content/privacy.content";
import type { LegalDocument } from "@/modules/legal/types/legal.types";

const FORBIDDEN = [/Stripe/i, /Culqi/i, /Niubiz/i, /\bVisa\b/i, /Mastercard/i, /\bSSL\b/, /\bTLS\b/, /cifrad/i, /\bPCI\b/, /comprobante/i];
const MARKERS = [/undefined/, /\bTBD\b/, /\bTODO\b/, /\[[^\]]*\]/, /\bnull\b/];

function allText(doc: LegalDocument): string {
  return [
    doc.title,
    doc.intro,
    doc.notice,
    ...doc.sections.flatMap((s) => [s.title, ...s.paragraphs, ...(s.items ?? []), ...(s.links ?? []).map((l) => l.label)]),
  ]
    .filter(Boolean)
    .join("\n");
}

describe("privacy content", () => {
  it("matches the builder output with the real config", () => {
    expect(PRIVACY_DOCUMENT).toEqual(buildPrivacyDocument(LEGAL_CONFIG));
  });

  it("has the expected title and sections in order", () => {
    expect(PRIVACY_DOCUMENT.title).toBe("Política de privacidad");
    expect(PRIVACY_DOCUMENT.sections.map((s) => s.title)).toEqual([
      "Responsable del tratamiento",
      "Datos que recopilamos",
      "Finalidades",
      "Consentimiento y base legal",
      "Destinatarios y encargados",
      "Transferencia internacional",
      "Plazo de conservación",
      "Derechos sobre tus datos y cómo ejercerlos",
      "Seguridad",
      "Cookies y almacenamiento local",
      "Cambios",
    ]);
  });

  it.each([
    ["real config", LEGAL_CONFIG],
    ["empty config", {}],
  ])("has unique ids, a valid date and no forbidden words or markers (%s)", (_, config) => {
    const doc = buildPrivacyDocument(config);
    const ids = doc.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Number.isNaN(Date.parse(doc.updatedAt))).toBe(false);
    expect(doc.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-05:00$/);

    const text = allText(doc);
    for (const pattern of [...FORBIDDEN, ...MARKERS]) expect(text).not.toMatch(pattern);
  });

  it("uses company data from the config", () => {
    const text = allText(PRIVACY_DOCUMENT);
    expect(text).toContain("20513249510");
    expect(text).toContain("Calle las Acasias Nro 1850");
    expect(text).toContain("atencion@inkasign.com");
    expect(text).toContain("mientras la cuenta esté activa");
    for (const vendor of ["Clerk", "Neon", "Vercel", "Unsplash"]) expect(text).toContain(vendor);
  });

  it("keeps the newsletter statement: only the email, no third parties, unsubscribe by email", () => {
    const text = allText(PRIVACY_DOCUMENT);
    expect(text).toContain("solo recogemos tu correo electrónico");
    expect(text).toContain("No compartimos tu correo del newsletter con terceros");
    expect(text).toContain("la baja se tramita por correo a atencion@inkasign.com");
  });

  it("states the ARCO deadlines", () => {
    const text = allText(PRIVACY_DOCUMENT);
    expect(text).toContain("8 días hábiles");
    expect(text).toContain("20 días hábiles");
    expect(text).toContain("10 días hábiles");
  });

  it("shows the brand notice only with the real config", () => {
    expect(PRIVACY_DOCUMENT.notice).toBe("Ticketera es una marca de TicketYa.com");
    expect(buildPrivacyDocument({}).notice).toBeUndefined();
  });

  it("omits retention and company details when the config is empty", () => {
    const doc = buildPrivacyDocument({});
    expect(doc.sections.map((s) => s.id)).not.toContain("conservacion");
    expect(allText(doc)).not.toContain("RUC");
  });

  it("does not mention the complaints book while its URL is undefined", () => {
    const doc = buildPrivacyDocument({ ...LEGAL_CONFIG, complaintsBookUrl: undefined });
    expect(allText(doc)).not.toMatch(/libro de reclamaciones/i);
  });

  it("declares the complaints book data, purpose and retention once it is active", () => {
    const text = allText(PRIVACY_DOCUMENT);
    expect(text).toMatch(/Libro de Reclamaciones: los datos que ingresas/);
    expect(text).toMatch(/domicilio, teléfono, correo electrónico/);
    expect(text).toMatch(/Atender y responder los reclamos y quejas/);
    expect(text).toMatch(/se conservan durante 2 años \(plazo a verificar/);
  });

  it("keeps the retention section for claims even without a general retention period", () => {
    const doc = buildPrivacyDocument({ ...LEGAL_CONFIG, retention: undefined });
    const titles = doc.sections.map((s) => s.title);
    expect(titles).toContain("Plazo de conservación");
    expect(allText(doc)).not.toMatch(/Conservamos tus datos/);
  });
});

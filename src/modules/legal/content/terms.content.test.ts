import { describe, expect, it } from "vitest";

import { LEGAL_CONFIG, type LegalConfig } from "@/modules/legal/content/legal-config";
import type { LegalDocument } from "@/modules/legal/types/legal.types";

import { buildTermsDocument, TERMS_DOCUMENT } from "./terms.content";

const FORBIDDEN = [
  /Stripe/i,
  /Culqi/i,
  /Niubiz/i,
  /\bVisa\b/i,
  /Mastercard/i,
  /\bSSL\b/i,
  /\bTLS\b/i,
  /cifrad/i,
  /\bPCI\b/,
  /comprobante/i,
];
const MARKERS = [/\[/, /\]/, /TBD/, /TODO/, /undefined/, /null/];

function allText(doc: LegalDocument): string {
  return [
    doc.title,
    doc.intro,
    doc.notice,
    ...doc.sections.flatMap((s) => [
      s.title,
      ...s.paragraphs,
      ...(s.items ?? []),
      ...(s.links ?? []).flatMap((l) => [l.label, l.href]),
    ]),
  ]
    .filter(Boolean)
    .join("\n");
}

const CONFIGS: [string, LegalConfig][] = [
  ["real config", LEGAL_CONFIG],
  ["empty config", {}],
];

describe("terms content", () => {
  it("exports the document built from LEGAL_CONFIG", () => {
    expect(TERMS_DOCUMENT).toEqual(buildTermsDocument(LEGAL_CONFIG));
  });

  it("has the expected title and sections with the real config", () => {
    const doc = buildTermsDocument(LEGAL_CONFIG);
    expect(doc.title).toBe("Términos y condiciones");
    expect(doc.sections.map((s) => s.title)).toEqual([
      "Información del proveedor",
      "Objeto y aceptación",
      "Cuenta de usuario",
      "Rol de la plataforma y del organizador",
      "Compra de entradas",
      "Entradas digitales y acceso",
      "Cancelaciones y devoluciones",
      "Obligaciones del usuario",
      "Propiedad intelectual",
      "Datos personales",
      "Atención al consumidor",
      "Cambios en los términos",
      "Ley aplicable y jurisdicción",
    ]);
  });

  it("uses company data from the config", () => {
    const text = allText(buildTermsDocument(LEGAL_CONFIG));
    expect(text).toContain("TicketYa.com");
    expect(text).toContain("20513249510");
    expect(text).toContain("Calle las Acasias Nro 1850");
    expect(text).toContain("atencion@inkasign.com");
    expect(text).toContain("leyes del Perú y tribunales de Lima");
  });

  it("links to returns, privacy and cookies", () => {
    const hrefs = buildTermsDocument(LEGAL_CONFIG).sections.flatMap((s) =>
      (s.links ?? []).map((l) => l.href),
    );
    expect(hrefs).toEqual(["/devoluciones", "/privacidad", "/cookies"]);
  });

  it("shows the brand notice only with the real config", () => {
    expect(buildTermsDocument(LEGAL_CONFIG).notice).toBe("Ticketera es una marca de TicketYa.com");
    expect(buildTermsDocument({}).notice).toBeUndefined();
  });

  it("omits company sections when data is missing", () => {
    const titles = buildTermsDocument({}).sections.map((s) => s.title);
    expect(titles).not.toContain("Información del proveedor");
    expect(titles).not.toContain("Atención al consumidor");
    expect(titles).not.toContain("Ley aplicable y jurisdicción");
  });

  it("omits RUC and address lines when they are missing", () => {
    const doc = buildTermsDocument({ legalName: "TicketYa.com" });
    const provider = doc.sections[0];
    expect(provider.items).toEqual(["Proveedor: TicketYa.com"]);
  });

  it("does not mention the complaints book while complaintsBookUrl is undefined", () => {
    expect(allText(buildTermsDocument(LEGAL_CONFIG))).not.toMatch(/Libro de Reclamaciones/i);
  });

  it("mentions and links the complaints book when complaintsBookUrl is defined", () => {
    const doc = buildTermsDocument({
      ...LEGAL_CONFIG,
      complaintsBookUrl: "/libro-de-reclamaciones",
    });
    const hrefs = doc.sections.flatMap((s) => (s.links ?? []).map((l) => l.href));
    expect(hrefs).toContain("/libro-de-reclamaciones");
  });

  it.each(CONFIGS)("has unique ids and a valid ISO date (%s)", (_name, config) => {
    const doc = buildTermsDocument(config);
    const ids = doc.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Number.isNaN(Date.parse(doc.updatedAt))).toBe(false);
    expect(doc.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-05:00$/);
  });

  it.each(CONFIGS)("has no forbidden words or placeholders (%s)", (_name, config) => {
    const text = allText(buildTermsDocument(config));
    for (const pattern of [...FORBIDDEN, ...MARKERS]) {
      expect(text).not.toMatch(pattern);
    }
  });
});

import { describe, expect, it } from "vitest";

import { LEGAL_CONFIG } from "@/modules/legal/content/legal-config";
import {
  RETURNS_DOCUMENT,
  buildReturnsDocument,
} from "@/modules/legal/content/returns.content";
import type { LegalDocument } from "@/modules/legal/types/legal.types";

const FORBIDDEN = [
  /Stripe/i,
  /Culqi/i,
  /Niubiz/i,
  /\bVisa\b/i,
  /Mastercard/i,
  /\bSSL\b/,
  /\bTLS\b/,
  /cifrad/i,
  /\bPCI\b/,
  /comprobante/i,
  /\[|\]/,
  /TBD|TODO|undefined/,
];

const allText = (doc: LegalDocument) =>
  [
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

const FULL_TITLES = [
  "Alcance",
  "Cancelación del evento",
  "Reprogramación o cambios",
  "Devolución a pedido del cliente",
  "Cómo solicitar una devolución",
  "Garantía legal",
  "Reclamos",
];

describe("buildReturnsDocument", () => {
  it("has the expected title and sections with the real config", () => {
    expect(RETURNS_DOCUMENT.title).toBe("Garantía y devoluciones");
    expect(RETURNS_DOCUMENT.sections.map((s) => s.title)).toEqual(FULL_TITLES);
  });

  it("has unique section ids and a valid ISO updatedAt", () => {
    const ids = RETURNS_DOCUMENT.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Number.isNaN(Date.parse(RETURNS_DOCUMENT.updatedAt))).toBe(false);
  });

  it.each([
    ["real config", RETURNS_DOCUMENT],
    ["empty config", buildReturnsDocument({})],
  ])("has no forbidden words or placeholders with %s", (_name, doc) => {
    const text = allText(doc);
    for (const pattern of FORBIDDEN) expect(text).not.toMatch(pattern);
  });

  it("states the refund policy and the legal references", () => {
    const text = allText(RETURNS_DOCUMENT);
    expect(text).toContain("100%");
    expect(text).toContain("15 días hábiles");
    expect(text).toContain("Ley N.º 32415");
    expect(text).toContain("Ley N.º 29571");
    expect(text).toContain("atencion@inkasign.com");
    expect(text).toContain("el código de tus entradas");
    expect(text).toContain("manual");
  });

  it("presents the policy outside concerts as a commercial decision", () => {
    const section = RETURNS_DOCUMENT.sections.find(
      (s) => s.id === "reprogramacion-o-cambios",
    )!;
    expect(section.paragraphs.join(" ")).toContain("decisión comercial propia");
  });

  it("does not mention the complaints book without complaintsBookUrl", () => {
    expect(LEGAL_CONFIG.complaintsBookUrl).toBeUndefined();
    const text = allText(RETURNS_DOCUMENT);
    expect(text).not.toMatch(/libro/i);
    expect(text).not.toMatch(/reclamaciones/i);
    expect(RETURNS_DOCUMENT.sections.every((s) => !s.links)).toBe(true);
  });

  it("mentions and links the complaints book when configured", () => {
    const doc = buildReturnsDocument({
      ...LEGAL_CONFIG,
      complaintsBookUrl: "/libro-de-reclamaciones",
    });
    const section = doc.sections.find((s) => s.id === "reclamos")!;
    expect(section.links).toEqual([
      { label: "Libro de Reclamaciones", href: "/libro-de-reclamaciones" },
    ]);
    expect(section.paragraphs.join(" ")).toContain("15 días hábiles");
  });

  it("includes the brand notice with the real config only", () => {
    expect(RETURNS_DOCUMENT.notice).toBe("Ticketera es una marca de TicketYa.com");
    expect(buildReturnsDocument({}).notice).toBeUndefined();
  });

  it("omits email-dependent sections with an empty config", () => {
    const titles = buildReturnsDocument({}).sections.map((s) => s.title);
    expect(titles).not.toContain("Cómo solicitar una devolución");
    expect(titles).not.toContain("Reclamos");
  });

  it("does not say the order number is shown in Mis entradas", () => {
    const text = RETURNS_DOCUMENT.sections.flatMap((s) => s.paragraphs ?? []).join(" ");
    expect(text).not.toMatch(/confirmación de compra y en "Mis entradas"/);
    expect(text).toMatch(/Pedido N\.º" de la confirmación de compra/);
  });

  it("marks the Ley 32415 deadline as pending verification", () => {
    const text = RETURNS_DOCUMENT.sections.flatMap((s) => s.paragraphs ?? []).join(" ");
    expect(text).toMatch(/Ley N\.º 32415[^.]*a verificar en la normativa vigente/);
  });
});

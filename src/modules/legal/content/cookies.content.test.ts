import { describe, expect, it } from "vitest";

import { LEGAL_CONFIG } from "@/modules/legal/content/legal-config";

import { buildCookiesDocument, COOKIES_DOCUMENT } from "./cookies.content";

const FORBIDDEN = /\b(Stripe|Culqi|Niubiz|Visa|Mastercard|SSL|TLS|PCI)\b|cifrad|comprobante/i;
const PLACEHOLDERS = /\[|\]|TBD|TODO|undefined|null/;

function allText(config = LEGAL_CONFIG) {
  const doc = buildCookiesDocument(config);
  return [
    doc.title,
    doc.intro,
    doc.notice,
    ...doc.sections.flatMap((s) => [s.title, ...s.paragraphs, ...(s.items ?? [])]),
  ]
    .filter(Boolean)
    .join("\n");
}

describe.each([
  ["real config", LEGAL_CONFIG],
  ["empty config", {}],
])("buildCookiesDocument with %s", (_name, config) => {
  const doc = buildCookiesDocument(config);

  it("has the expected title and sections", () => {
    expect(doc.title).toBe("Política de cookies");
    expect(doc.sections.map((s) => s.title)).toEqual([
      "Qué son las cookies",
      "Cookies que usamos",
      "Almacenamiento local",
      "Por qué no pedimos consentimiento",
      "Cómo gestionarlas",
      "Cambios en esta política",
    ]);
  });

  it("has unique section ids and a valid ISO date", () => {
    const ids = doc.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Number.isNaN(Date.parse(doc.updatedAt))).toBe(false);
    expect(doc.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-05:00$/);
  });

  it("has no forbidden words or placeholders", () => {
    const text = allText(config);
    expect(text).not.toMatch(FORBIDDEN);
    expect(text).not.toMatch(PLACEHOLDERS);
  });

  it("does not name Clerk cookies or durations and never mentions the complaints book", () => {
    const text = allText(config);
    expect(text).not.toMatch(/__client|__session|__clerk|\d+\s*(días|horas|minutos|años)/i);
    expect(text).not.toMatch(/libro de reclamaciones/i);
  });

  it("describes the sessionStorage keys", () => {
    const text = allText(config);
    expect(text).toContain("ticketera-purchase");
    expect(text).toContain("ticketera-synced");
  });
});

describe("brand notice", () => {
  it("is included with the real config", () => {
    expect(COOKIES_DOCUMENT.notice).toBe("Ticketera es una marca de TicketYa.com");
  });

  it("is omitted with an empty config", () => {
    expect(buildCookiesDocument({}).notice).toBeUndefined();
  });
});

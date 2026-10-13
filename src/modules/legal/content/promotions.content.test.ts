import { describe, expect, it } from "vitest";

import { LEGAL_CONFIG } from "@/modules/legal/content/legal-config";
import {
  PROMOTIONS_DOCUMENT,
  buildPromotionsDocument,
} from "@/modules/legal/content/promotions.content";
import type { LegalDocument } from "@/modules/legal/types/legal.types";

const allText = (doc: LegalDocument) =>
  [
    doc.title,
    doc.notice,
    ...doc.sections.flatMap((s) => [s.title, ...s.paragraphs, ...(s.items ?? [])]),
  ]
    .filter(Boolean)
    .join("\n");

describe("buildPromotionsDocument", () => {
  it("has the expected title and unique section ids", () => {
    expect(PROMOTIONS_DOCUMENT.title).toBe("Términos de campañas comerciales");
    const ids = PROMOTIONS_DOCUMENT.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Number.isNaN(Date.parse(PROMOTIONS_DOCUMENT.updatedAt))).toBe(false);
  });

  it("references the consumer law and does not claim existing raffles", () => {
    const text = allText(PROMOTIONS_DOCUMENT);
    expect(text).toContain("Ley N.º 29571");
    expect(text).toContain("Si en el futuro se realizan sorteos");
  });

  it("has no placeholders with real or empty config", () => {
    for (const doc of [PROMOTIONS_DOCUMENT, buildPromotionsDocument({})]) {
      expect(allText(doc)).not.toMatch(/\[|\]|TBD|TODO|undefined/);
    }
  });

  it("links the complaints book and the support email with the real config", () => {
    const section = PROMOTIONS_DOCUMENT.sections.find(
      (s) => s.id === "consultas-y-reclamos",
    )!;
    expect(section.links).toEqual([
      { label: "Libro de Reclamaciones", href: LEGAL_CONFIG.complaintsBookUrl },
    ]);
    expect(section.paragraphs.join(" ")).toContain(
      LEGAL_CONFIG.customerServiceEmail,
    );
  });

  it("omits the contact section and notice with an empty config", () => {
    const doc = buildPromotionsDocument({});
    expect(doc.sections.map((s) => s.id)).not.toContain("consultas-y-reclamos");
    expect(doc.notice).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";

import {
  CANCELLATION_NOTE_MAX,
  CANCELLATION_REASON_LABELS,
  CANCELLATION_REASONS,
  cancelEventInputSchema,
} from "@/modules/organizer/schemas/cancellation.schema";

const ID = "3f8a1c52-9d4e-4b7a-8c11-2e5f6a7b8c9d";

describe("cancelEventInputSchema", () => {
  it("acepta un motivo válido sin nota", () => {
    expect(cancelEventInputSchema.safeParse({ id: ID, reason: "artist" }).success).toBe(true);
  });

  it("rechaza un motivo desconocido", () => {
    expect(cancelEventInputSchema.safeParse({ id: ID, reason: "aburrimiento" }).success).toBe(false);
  });

  it("rechaza un id que no es UUID", () => {
    expect(cancelEventInputSchema.safeParse({ id: "abc", reason: "artist" }).success).toBe(false);
  });

  it("exige nota cuando el motivo es 'other'", () => {
    expect(cancelEventInputSchema.safeParse({ id: ID, reason: "other" }).success).toBe(false);
    expect(cancelEventInputSchema.safeParse({ id: ID, reason: "other", note: "   " }).success).toBe(false);
    expect(cancelEventInputSchema.safeParse({ id: ID, reason: "other", note: "Falla eléctrica" }).success).toBe(true);
  });

  it("recorta la nota", () => {
    const parsed = cancelEventInputSchema.parse({ id: ID, reason: "venue", note: "  Techo dañado  " });
    expect(parsed.note).toBe("Techo dañado");
  });

  it("rechaza notas de más de 500 caracteres", () => {
    const long = "a".repeat(CANCELLATION_NOTE_MAX + 1);
    expect(cancelEventInputSchema.safeParse({ id: ID, reason: "venue", note: long }).success).toBe(false);
    const ok = "a".repeat(CANCELLATION_NOTE_MAX);
    expect(cancelEventInputSchema.safeParse({ id: ID, reason: "venue", note: ok }).success).toBe(true);
  });
});

describe("CANCELLATION_REASON_LABELS", () => {
  it("tiene una etiqueta no vacía para cada motivo", () => {
    for (const reason of CANCELLATION_REASONS) {
      expect(CANCELLATION_REASON_LABELS[reason].length).toBeGreaterThan(0);
    }
  });
});

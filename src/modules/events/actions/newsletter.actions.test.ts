import { beforeEach, describe, expect, it, vi } from "vitest";

const { subscribeToNewsletter } = vi.hoisted(() => ({ subscribeToNewsletter: vi.fn() }));

vi.mock("@/modules/events/services/newsletter.service", () => ({ subscribeToNewsletter }));

import { subscribeToNewsletterAction } from "./newsletter.actions";

describe("subscribeToNewsletterAction", () => {
  beforeEach(() => {
    subscribeToNewsletter.mockReset();
    subscribeToNewsletter.mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("normaliza el correo y devuelve ok", async () => {
    await expect(subscribeToNewsletterAction({ email: " Ana@Mail.COM " })).resolves.toEqual({
      ok: true,
    });
    expect(subscribeToNewsletter).toHaveBeenCalledWith("ana@mail.com");
  });

  it("devuelve el mismo resultado para un correo ya existente", async () => {
    const first = await subscribeToNewsletterAction({ email: "a@b.com" });
    const second = await subscribeToNewsletterAction({ email: "a@b.com" });
    expect(second).toEqual(first);
  });

  it("rechaza correo vacío sin llamar al service", async () => {
    await expect(subscribeToNewsletterAction({ email: "  " })).resolves.toEqual({
      ok: false,
      error: "Ingresa tu correo.",
    });
    expect(subscribeToNewsletter).not.toHaveBeenCalled();
  });

  it("rechaza correo inválido y entrada no objeto", async () => {
    await expect(subscribeToNewsletterAction({ email: "nope" })).resolves.toEqual({
      ok: false,
      error: "Ingresa un correo válido.",
    });
    const result = await subscribeToNewsletterAction(null);
    expect(result.ok).toBe(false);
    expect(subscribeToNewsletter).not.toHaveBeenCalled();
  });

  it("no filtra detalles cuando falla la base", async () => {
    subscribeToNewsletter.mockRejectedValue(new Error("connection string secret"));
    const result = await subscribeToNewsletterAction({ email: "a@b.com" });
    expect(result).toEqual({
      ok: false,
      error: "No pudimos completar tu suscripción. Inténtalo de nuevo más tarde.",
    });
    expect(console.error).toHaveBeenCalled();
  });
});

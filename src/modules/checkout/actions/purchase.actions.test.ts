import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  purchaseTickets: vi.fn(),
  safeRecord: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/modules/auth/services/current-user.service", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/modules/audit/services/audit.service", () => ({ safeRecord: mocks.safeRecord }));
vi.mock("@/modules/checkout/services/purchase.service", () => {
  class PurchaseError extends Error {}
  return { PurchaseError, purchaseTickets: mocks.purchaseTickets };
});

import { purchaseTicketsAction } from "./purchase.actions";
import { IMPERSONATION_CHECKOUT_MESSAGE } from "@/modules/checkout/services/checkout-guard";

const validRequest = {
  eventSlug: "mi-evento",
  selection: { quantities: { general: 2 }, seats: {} },
  buyer: { fullName: "Ana Perez", email: "ana@example.com" },
};

describe("purchaseTicketsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.safeRecord.mockResolvedValue(undefined);
    mocks.purchaseTickets.mockResolvedValue({ orderId: "o1", checkoutUrl: "https://pay" });
  });

  it("compra con normalidad sin impersonación", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u1", impersonatedBy: null });

    const result = await purchaseTicketsAction(validRequest);

    expect(result).toEqual({ ok: true, orderId: "o1", checkoutUrl: "https://pay" });
    expect(mocks.purchaseTickets).toHaveBeenCalledTimes(1);
    expect(mocks.safeRecord).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledTimes(2);
  });

  it("bloquea y audita al impersonar, sin llamar a purchaseTickets", async () => {
    const actor = { id: "u1", impersonatedBy: { id: "admin" } };
    mocks.getCurrentUser.mockResolvedValue(actor);

    const result = await purchaseTicketsAction(validRequest);

    expect(result).toEqual({ ok: false, error: IMPERSONATION_CHECKOUT_MESSAGE });
    expect(mocks.purchaseTickets).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.safeRecord).toHaveBeenCalledTimes(1);
    expect(mocks.safeRecord).toHaveBeenCalledWith(actor, {
      action: "checkout.blocked_impersonation",
      targetType: "event",
      targetId: "mi-evento",
      result: "denied",
      errorCode: "impersonation",
      metadata: { reason: "impersonating" },
    });
  });

  it("devuelve el bloqueo aunque el registro de auditoría resuelva con error interno", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u1", impersonatedBy: { id: "admin" } });
    mocks.safeRecord.mockResolvedValue(undefined);

    await expect(purchaseTicketsAction(validRequest)).resolves.toEqual({
      ok: false,
      error: IMPERSONATION_CHECKOUT_MESSAGE,
    });
  });

  it("un eventSlug inválido sigue dando error de validación al impersonar", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u1", impersonatedBy: { id: "admin" } });

    const result = await purchaseTicketsAction({ ...validRequest, eventSlug: "" });

    expect(result.ok).toBe(false);
    expect(result).not.toEqual({ ok: false, error: IMPERSONATION_CHECKOUT_MESSAGE });
    expect(mocks.safeRecord).not.toHaveBeenCalled();
  });
});

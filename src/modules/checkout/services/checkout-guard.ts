import type { CurrentUser } from "@/modules/auth/services/current-user.service";

export const IMPERSONATION_CHECKOUT_MESSAGE =
  "No puedes comprar entradas mientras actúas como otro usuario. Termina la impersonación para continuar.";

export type CheckoutBlockReason = "impersonating";

export function checkoutBlockReason(user: CurrentUser | null): CheckoutBlockReason | null {
  return user?.impersonatedBy ? "impersonating" : null;
}

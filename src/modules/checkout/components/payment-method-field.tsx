import { CreditCard, Smartphone, Store } from "lucide-react";
import type { ComponentType } from "react";

import { cn } from "@/lib/utils";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  type PaymentMethod,
} from "@/modules/checkout/schemas/checkout.schema";

interface PaymentMethodFieldProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  className?: string;
}

const ICONS: Record<PaymentMethod, ComponentType<{ className?: string }>> = {
  card: CreditCard,
  yape: Smartphone,
  cash: Store,
};

/** Grupo de radios (nativos) con apariencia de tarjeta seleccionable. */
export function PaymentMethodField({ value, onChange, className }: PaymentMethodFieldProps) {
  return (
    <fieldset className={cn("grid grid-cols-3 gap-2 sm:gap-3", className)}>
      <legend className="sr-only">Método de pago</legend>
      {PAYMENT_METHODS.map((method) => {
        const Icon = ICONS[method];
        const isSelected = method === value;
        return (
          <label
            key={method}
            className={cn(
              "flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border-[1.5px] px-2 text-sm font-semibold transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring sm:justify-start sm:px-4 sm:text-[0.9375rem]",
              isSelected ? "border-primary bg-accent text-accent-foreground" : "bg-background hover:bg-muted"
            )}
          >
            <input
              type="radio"
              name="paymentMethod"
              value={method}
              checked={isSelected}
              onChange={() => onChange(method)}
              className="sr-only"
            />
            <Icon className="hidden size-5 shrink-0 sm:block" aria-hidden="true" />
            {PAYMENT_METHOD_LABELS[method]}
          </label>
        );
      })}
    </fieldset>
  );
}

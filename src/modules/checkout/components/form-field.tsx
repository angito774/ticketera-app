import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** id del DOM de un campo del checkout: "card.number" → "checkout-card-number". */
export function checkoutFieldId(field: string): string {
  return `checkout-${field.replace(/\./g, "-")}`;
}

/** Props de accesibilidad para el control de un campo con posible error. */
export function fieldA11yProps(field: string, error?: string) {
  const id = checkoutFieldId(field);
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  };
}

interface FormFieldProps {
  field: string;
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export const INPUT_CLASSES = "h-12 rounded-xl px-3.5 text-base md:text-[0.9375rem]";

export function FormField({ field, label, error, children, className }: FormFieldProps) {
  const id = checkoutFieldId(field);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-[0.8125rem] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

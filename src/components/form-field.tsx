import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Props de accesibilidad para el control de un campo con posible error. */
export function fieldA11yProps(id: string, error?: string) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  };
}

interface FormFieldProps {
  /** id del control; el error usa `${id}-error`. */
  id: string;
  label: string;
  error?: string;
  /** Contenido junto a la etiqueta (ej. "¿Olvidaste tu contraseña?"). */
  labelAside?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Clases de los inputs de formularios de la app (alto táctil cómodo). */
export const FIELD_INPUT_CLASSES = "h-12 rounded-xl px-3.5 text-base md:text-[0.9375rem]";

export function FormField({ id, label, error, labelAside, children, className }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {labelAside}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-[0.8125rem] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

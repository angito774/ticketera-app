import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

/** Props de accesibilidad para el control de un campo con posible error. */
export function fieldA11yProps(id: string, error?: string, required?: boolean) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
    "aria-required": required || undefined,
  };
}

interface FormFieldProps {
  /** id del control; el error usa `${id}-error`. */
  id: string;
  label: string;
  error?: string;
  /** Muestra el asterisco rojo de obligatorio junto a la etiqueta. */
  required?: boolean;
  /** Contenido junto a la etiqueta (ej. "¿Olvidaste tu contraseña?"). */
  labelAside?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Clases de los inputs de formularios de la app (alto táctil cómodo; fondo rojo suave si es inválido). */
export const FIELD_INPUT_CLASSES =
  "h-12 rounded-xl px-3.5 text-base aria-invalid:bg-destructive/5 md:text-[0.9375rem]";

/** Asterisco de campo obligatorio (el control lleva `aria-required`, así que no se lee dos veces). */
export function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-0.5 font-semibold text-destructive">
      *
    </span>
  );
}

/** Mensaje de error bajo un campo, enlazado por `aria-describedby`. */
export function FieldError({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <p id={`${id}-error`} className={cn("flex items-start gap-1.5 text-[0.8125rem] text-destructive", className)}>
      <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

export function FormField({ id, label, error, required, labelAside, children, className }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className={cn("text-sm font-medium transition-colors", error && "text-destructive")}>
          {label}
          {required && <RequiredMark />}
        </label>
        {labelAside}
      </div>
      {children}
      {error && <FieldError id={id}>{error}</FieldError>}
    </div>
  );
}

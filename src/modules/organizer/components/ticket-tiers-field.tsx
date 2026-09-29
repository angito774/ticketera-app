"use client";

import { Plus, Trash2 } from "lucide-react";

import { fieldA11yProps } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { EMPTY_TIER, type TierField, type TierFormValues } from "@/modules/organizer/schemas/event-form.schema";

interface TicketTiersFieldProps {
  tiers: TierFormValues[];
  tierErrors?: Partial<Record<TierField, string>>[];
  error?: string;
  onChange: (tiers: TierFormValues[]) => void;
}

const numberFormatter = new Intl.NumberFormat("es-PE");
const GRID = "lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_44px] lg:gap-3";
const INPUT_CLASSES = "h-11 rounded-xl px-3 text-base md:text-[0.9375rem]";

export function tierFieldId(index: number, field: TierField): string {
  return `tier-${index}-${field}`;
}

const FIELDS: { field: TierField; label: string; placeholder: string; inputMode?: "decimal" | "numeric" }[] = [
  { field: "name", label: "Nombre", placeholder: "Ej. General" },
  { field: "price", label: "Precio (S/)", placeholder: "0", inputMode: "decimal" },
  { field: "quantity", label: "Cantidad", placeholder: "0", inputMode: "numeric" },
];

/** Filas de tipos de entrada: filas de grilla en escritorio, tarjetas con etiquetas en móvil. */
export function TicketTiersField({ tiers, tierErrors, error, onChange }: TicketTiersFieldProps) {
  const capacity = tiers.reduce((sum, tier) => sum + (Number.parseInt(tier.quantity, 10) || 0), 0);
  const update = (index: number, patch: Partial<TierFormValues>) =>
    onChange(tiers.map((tier, position) => (position === index ? { ...tier, ...patch } : tier)));

  return (
    <div className="flex flex-col gap-3">
      <div aria-hidden="true" className={cn("hidden px-1 text-[0.8125rem] font-medium text-muted-foreground", GRID)}>
        <span>Nombre</span>
        <span>Precio (S/)</span>
        <span>Cantidad</span>
        <span />
      </div>

      {tiers.map((tier, index) => (
        <fieldset
          key={index}
          className={cn("relative flex flex-col gap-3 rounded-2xl border p-4 lg:items-start lg:border-0 lg:p-0", GRID)}
        >
          <legend className="float-left mb-1 text-sm font-semibold lg:sr-only">Tipo {index + 1}</legend>
          {FIELDS.map(({ field, label, placeholder, inputMode }) => {
            const fieldError = tierErrors?.[index]?.[field];
            const id = tierFieldId(index, field);
            return (
              <div key={field} className="flex flex-col gap-1.5">
                <label htmlFor={id} className="text-sm font-medium lg:sr-only">
                  {label}
                  <span className="sr-only"> del tipo de entrada {index + 1}</span>
                </label>
                <Input
                  {...fieldA11yProps(id, fieldError)}
                  type={field === "name" ? "text" : "number"}
                  min={field === "name" ? undefined : 0}
                  step={field === "price" ? "0.01" : field === "quantity" ? 1 : undefined}
                  inputMode={inputMode}
                  placeholder={placeholder}
                  value={tier[field]}
                  onChange={(event) => update(index, { [field]: event.target.value })}
                  className={INPUT_CLASSES}
                />
                {fieldError && (
                  <p id={`${id}-error`} className="text-[0.8125rem] text-destructive">
                    {fieldError}
                  </p>
                )}
              </div>
            );
          })}
          <button
            type="button"
            aria-label={`Quitar tipo de entrada ${index + 1}`}
            disabled={tiers.length === 1}
            onClick={() => onChange(tiers.filter((_, position) => position !== index))}
            className="absolute top-2 right-2 flex size-11 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 lg:static"
          >
            <Trash2 className="size-4.5" aria-hidden="true" />
          </button>
        </fieldset>
      ))}

      {error && <p className="text-[0.8125rem] text-destructive">{error}</p>}

      <button
        type="button"
        onClick={() => onChange([...tiers, EMPTY_TIER])}
        className="flex h-11 w-fit cursor-pointer items-center gap-2 rounded-xl border-[1.5px] border-dashed px-4 text-sm font-semibold text-primary transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring"
      >
        <Plus className="size-4" aria-hidden="true" />
        Agregar tipo de entrada
      </button>

      <p aria-live="polite" className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3 text-sm">
        <span className="text-muted-foreground">Capacidad total</span>
        <strong className="font-semibold tabular-nums">{numberFormatter.format(capacity)} entradas</strong>
      </p>
    </div>
  );
}

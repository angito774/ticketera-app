import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  min?: number;
  max: number;
  /** Nombre de lo que se cuenta, para los aria-label: "Campo General". */
  itemLabel: string;
  onChange: (value: number) => void;
  className?: string;
}

const BUTTON_CLASSES =
  "flex size-10 cursor-pointer items-center justify-center rounded-[0.6875rem] transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring aria-disabled:cursor-not-allowed aria-disabled:opacity-40";

export function QuantityStepper({
  value,
  min = 0,
  max,
  itemLabel,
  onChange,
  className,
}: QuantityStepperProps) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-[0.875rem] border p-[3px]",
        className
      )}
    >
      <button
        type="button"
        aria-label={`Quitar una entrada de ${itemLabel}`}
        aria-disabled={value <= min}
        onClick={() => {
          if (value > min) onChange(value - 1);
        }}
        className={cn(BUTTON_CLASSES, "bg-muted text-foreground hover:bg-border")}
      >
        <Minus className="size-4.5" aria-hidden="true" />
      </button>
      <span
        aria-live="polite"
        className="w-8 text-center font-semibold tabular-nums"
      >
        {value}
      </span>
      <button
        type="button"
        aria-label={`Agregar una entrada de ${itemLabel}`}
        aria-disabled={value >= max}
        onClick={() => {
          if (value < max) onChange(value + 1);
        }}
        className={cn(
          BUTTON_CLASSES,
          "bg-foreground text-background hover:bg-foreground/85"
        )}
      >
        <Plus className="size-4.5" aria-hidden="true" />
      </button>
    </span>
  );
}

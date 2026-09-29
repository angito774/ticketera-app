import Link from "next/link";
import { ArrowLeft, Check, Lock, Ticket } from "lucide-react";

import { cn } from "@/lib/utils";

type PurchaseStep = 1 | 2 | 3;

interface PurchaseHeaderProps {
  currentStep: PurchaseStep;
  backHref: string;
  backLabel: string;
  className?: string;
}

const STEPS: { step: PurchaseStep; label: string }[] = [
  { step: 1, label: "Entradas" },
  { step: 2, label: "Datos y pago" },
  { step: 3, label: "Confirmación" },
];

export function PurchaseHeader({
  currentStep,
  backHref,
  backLabel,
  className,
}: PurchaseHeaderProps) {
  const current = STEPS[currentStep - 1];

  return (
    <header
      className={cn("sticky top-0 z-40 border-b bg-background", className)}
    >
      {/* Escritorio: logo · pasos · compra segura */}
      <div className="mx-auto hidden h-19 max-w-7xl items-center justify-between gap-6 px-8 lg:flex">
        <Link
          href="/"
          className="flex w-60 cursor-pointer items-center gap-2.5 rounded-lg text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          <span className="flex size-9.5 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Ticket className="size-5" aria-hidden="true" />
          </span>
          <span className="text-xl font-bold tracking-tight">Ticketera</span>
        </Link>

        <ol
          aria-label="Pasos de la compra"
          className="flex items-center gap-3 text-sm"
        >
          {STEPS.map(({ step, label }, index) => {
            const isDone = step < currentStep;
            const isCurrent = step === currentStep;
            return (
              <li key={step} className="flex items-center gap-3">
                {index > 0 && (
                  <span aria-hidden="true" className="h-px w-10 bg-border" />
                )}
                <span
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-2.5",
                    isCurrent ? "font-semibold" : "text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full text-[0.8125rem]",
                      isCurrent && "bg-foreground text-background",
                      isDone && "bg-primary text-primary-foreground",
                      !isCurrent && !isDone && "border-[1.5px] border-border"
                    )}
                  >
                    {isDone ? (
                      <Check className="size-4" aria-label="Completado" />
                    ) : (
                      step
                    )}
                  </span>
                  {label}
                </span>
              </li>
            );
          })}
        </ol>

        <span className="flex w-60 items-center justify-end gap-2 text-sm text-muted-foreground">
          <Lock className="size-4" aria-hidden="true" />
          Compra segura
        </span>
      </div>

      {/* Móvil: volver · paso actual · barra de progreso */}
      <div className="lg:hidden">
        <div className="flex h-16 items-center gap-3 px-4">
          <Link
            href={backHref}
            aria-label={backLabel}
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border outline-none focus-visible:ring-3 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-xs text-muted-foreground">
              Paso {currentStep} de {STEPS.length}
            </span>
            <span className="truncate font-semibold">{current.label}</span>
          </div>
          <Lock
            className="size-4 text-muted-foreground"
            aria-label="Compra segura"
          />
        </div>
        <div aria-hidden="true" className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-300"
            style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </header>
  );
}

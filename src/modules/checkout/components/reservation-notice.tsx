import { AlertTriangle, Timer } from "lucide-react";

import { cn } from "@/lib/utils";

interface ReservationNoticeProps {
  /** "09:48" */
  timeLeft: string;
  isExpired: boolean;
  onRestart: () => void;
  className?: string;
}

/** Aviso de la reserva temporal de entradas, con su cuenta regresiva o el estado vencido. */
export function ReservationNotice({ timeLeft, isExpired, onRestart, className }: ReservationNoticeProps) {
  if (isExpired) {
    return (
      <div
        role="alert"
        className={cn(
          "flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between",
          className
        )}
      >
        <p className="flex items-start gap-3 text-destructive">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-semibold">Tu reserva expiró.</strong> Las entradas se liberaron;
            vuelve a elegirlas para continuar.
          </span>
        </p>
        <button
          type="button"
          onClick={onRestart}
          className="h-10 shrink-0 cursor-pointer rounded-xl border-[1.5px] border-foreground px-4 font-semibold transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring"
        >
          Volver a elegir entradas
        </button>
      </div>
    );
  }

  return (
    <p
      className={cn(
        "flex items-start gap-3 rounded-2xl bg-warning p-4 text-sm leading-relaxed text-warning-foreground sm:items-center",
        className
      )}
    >
      <Timer className="size-5 shrink-0" aria-hidden="true" />
      <span>
        Reservamos tus entradas por{" "}
        <strong className="font-bold tabular-nums" aria-live="off">
          {timeLeft}
        </strong>
        . Completa el pago antes de que se liberen.
      </span>
    </p>
  );
}

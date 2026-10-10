import { Timer } from "lucide-react";

import { cn } from "@/lib/utils";
import { HOLD_TTL_MINUTES } from "@/modules/payments/services/checkout-session.mapping";

interface ReservationNoticeProps {
  className?: string;
}

/** Aviso de la reserva que se crea al pagar: dura `HOLD_TTL_MINUTES` mientras se completa el pago en Stripe. */
export function ReservationNotice({ className }: ReservationNoticeProps) {
  return (
    <p
      className={cn(
        "flex items-start gap-3 rounded-2xl bg-warning p-4 text-sm leading-relaxed text-warning-foreground sm:items-center",
        className
      )}
    >
      <Timer className="size-5 shrink-0" aria-hidden="true" />
      <span>
        Al pagar reservamos tus entradas por{" "}
        <strong className="font-bold tabular-nums">{HOLD_TTL_MINUTES} minutos</strong>. Completa el pago en Stripe
        antes de que se liberen.
      </span>
    </p>
  );
}

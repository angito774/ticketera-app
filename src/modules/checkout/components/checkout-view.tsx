"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Ticket } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { StickyBottomBar } from "@/components/sticky-bottom-bar";
import { buttonVariants } from "@/components/ui/button";
import { useCountdown } from "@/hooks/use-countdown";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CheckoutForm, checkoutFieldId } from "@/modules/checkout/components/checkout-form";
import { CheckoutSummary, CheckoutSummaryCollapsible } from "@/modules/checkout/components/checkout-summary";
import { ReservationNotice } from "@/modules/checkout/components/reservation-notice";
import {
  EMPTY_CHECKOUT_VALUES,
  getFieldErrors,
  type CheckoutField,
  type CheckoutFieldErrors,
  type CheckoutFormValues,
} from "@/modules/checkout/schemas/checkout.schema";
import { createOrder } from "@/modules/checkout/services/orders.service";
import { useOrderStore } from "@/modules/checkout/store/order.store";
import type { EventDetail } from "@/modules/events/types/event.types";
import { buildPurchaseSummary, usePurchaseStore } from "@/modules/tickets/store/purchase.store";
import type { VenueLayout } from "@/modules/tickets/types/venue.types";

interface CheckoutViewProps {
  event: EventDetail;
  layout: VenueLayout;
  className?: string;
}

/** Orden visual de los campos, para enfocar el primero con error. */
const FIELD_ORDER: CheckoutField[] = [
  "fullName",
  "email",
  "documentNumber",
  "phone",
  "card.number",
  "card.expiry",
  "card.cvv",
  "card.holder",
  "acceptedTerms",
];

/** Simula la latencia de una pasarela de pago. */
const MOCK_PAYMENT_DELAY_MS = 900;

export function CheckoutView({ event, layout, className }: CheckoutViewProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const ticketsHref = `/events/${event.id}/tickets`;

  const purchase = usePurchaseStore(
    useShallow(({ eventId, quantities, seats }) => ({ eventId, quantities, seats }))
  );
  const { expiresAt, startReservation, resetReservation, completeOrder } = useOrderStore(
    useShallow((state) => ({
      expiresAt: state.reservationExpiresAt[event.id] ?? null,
      startReservation: state.startReservation,
      resetReservation: state.resetReservation,
      completeOrder: state.completeOrder,
    }))
  );

  const selection = useMemo(
    () => ({ quantities: purchase.quantities, seats: purchase.seats }),
    [purchase.quantities, purchase.seats]
  );
  const summary = useMemo(() => buildPurchaseSummary(layout, selection), [layout, selection]);
  const hasSelection = hydrated && purchase.eventId === event.id && summary.ticketCount > 0;

  const [values, setValues] = useState<CheckoutFormValues>(EMPTY_CHECKOUT_VALUES);
  const [errors, setErrors] = useState<CheckoutFieldErrors>({});
  const [wasSubmitted, setWasSubmitted] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    if (hasSelection && !isPaying) startReservation(event.id);
  }, [hasSelection, isPaying, event.id, startReservation]);

  const countdown = useCountdown(expiresAt);
  const isExpired = Boolean(expiresAt) && countdown.isExpired;

  const handleChange = (patch: Partial<CheckoutFormValues>) => {
    const next = { ...values, ...patch };
    setValues(next);
    // Tras el primer intento, los errores se recalculan en vivo para que desaparezcan al corregir.
    if (wasSubmitted) setErrors(getFieldErrors(next));
  };

  const handleSubmit = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (isPaying || isExpired) return;

    const nextErrors = getFieldErrors(values);
    setWasSubmitted(true);
    setErrors(nextErrors);

    const firstInvalid = FIELD_ORDER.find((field) => nextErrors[field]);
    if (firstInvalid) {
      document.getElementById(checkoutFieldId(firstInvalid))?.focus();
      return;
    }

    setIsPaying(true);
    setTimeout(() => {
      completeOrder(
        createOrder({
          eventId: event.id,
          layout,
          selection,
          buyer: { fullName: values.fullName, email: values.email, paymentMethod: values.paymentMethod },
        })
      );
      // La selección se limpia en la confirmación, para no mostrar el resumen vacío mientras se navega.
      router.push(`/events/${event.id}/confirmation`);
    }, MOCK_PAYMENT_DELAY_MS);
  };

  const restartReservation = () => {
    resetReservation(event.id);
    router.push(ticketsHref);
  };

  if (!hydrated) {
    return <div aria-busy="true" className="min-h-96" />;
  }

  if (!hasSelection && !isPaying) {
    return (
      <div className={cn("mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center", className)}>
        <Ticket className="size-10 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-2xl font-bold tracking-tight">No tienes entradas seleccionadas</h1>
        <p className="text-muted-foreground">Elige tus entradas para continuar con la compra.</p>
        <Link
          href={ticketsHref}
          className={cn(buttonVariants({ variant: "cta" }), "h-12 rounded-2xl px-6 text-base")}
        >
          Elegir entradas
        </Link>
      </div>
    );
  }

  const canPay = values.acceptedTerms && !isExpired && !isPaying;
  const payLabel = `Pagar ${formatPrice(summary.total)}`;
  const payButton = (buttonClassName: string) => (
    <button
      type="submit"
      disabled={!canPay}
      className={cn(
        buttonVariants({ variant: "cta" }),
        "rounded-2xl text-base disabled:bg-border disabled:text-muted-foreground disabled:opacity-100",
        buttonClassName
      )}
    >
      {isPaying ? (
        <>
          <Loader2 className="size-4.5 animate-spin" aria-hidden="true" />
          Procesando…
        </>
      ) : (
        <>
          <Lock className="size-4" aria-hidden="true" />
          {payLabel}
        </>
      )}
    </button>
  );
  const termsHint = !values.acceptedTerms && (
    <span className="text-center text-[0.8125rem] text-muted-foreground">Acepta los términos para continuar.</span>
  );

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-busy={isPaying}
      className={cn(
        "grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-8",
        className
      )}
    >
      <div className="flex flex-col gap-4 lg:gap-6">
        <ReservationNotice timeLeft={countdown.label} isExpired={isExpired} onRestart={restartReservation} />
        <CheckoutSummaryCollapsible event={event} summary={summary} ticketsHref={ticketsHref} />
        <CheckoutForm values={values} errors={errors} onChange={handleChange} />
      </div>

      <CheckoutSummary
        event={event}
        summary={summary}
        ticketsHref={ticketsHref}
        action={
          <div className="flex flex-col gap-2">
            {payButton("h-14")}
            {termsHint}
          </div>
        }
      />

      <StickyBottomBar className="flex-col items-stretch gap-1.5">
        {payButton("h-12 w-full")}
        {termsHint}
      </StickyBottomBar>
    </form>
  );
}

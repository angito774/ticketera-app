"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { CircleAlert, Loader2, Lock, Ticket } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { StickyBottomBar } from "@/components/sticky-bottom-bar";
import { buttonVariants } from "@/components/ui/button";
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
import { purchaseTicketsAction } from "@/modules/checkout/actions/purchase.actions";
import type { EventDetail } from "@/modules/events/types/event.types";
import { buildPurchaseSummary, usePurchaseStore, type PurchaseSelection } from "@/modules/tickets/store/purchase.store";
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
  "acceptedTerms",
];

export function CheckoutView({ event, layout, className }: CheckoutViewProps) {
  const hydrated = useHydrated();
  const ticketsHref = `/events/${event.id}/tickets`;

  const purchase = usePurchaseStore(
    useShallow(({ eventId, quantities, seats }) => ({ eventId, quantities, seats }))
  );
  const { user } = useUser();

  const selection = useMemo<PurchaseSelection>(
    () => ({ quantities: purchase.quantities, seats: purchase.seats }),
    [purchase.quantities, purchase.seats]
  );
  const summary = useMemo(() => buildPurchaseSummary(layout, selection), [layout, selection]);
  const hasSelection = hydrated && purchase.eventId === event.id && summary.ticketCount > 0;

  const [values, setValues] = useState<CheckoutFormValues>(EMPTY_CHECKOUT_VALUES);
  // Campos que el usuario ya dejó: se marcan en rojo si quedaron incompletos.
  const [touched, setTouched] = useState<ReadonlySet<CheckoutField>>(new Set());
  const [wasSubmitted, setWasSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const isPaying = isPending || redirecting;

  if (user && !prefilled) {
    setPrefilled(true);
    setValues((current) => ({
      ...current,
      fullName: current.fullName || user.fullName || "",
      email: current.email || user.primaryEmailAddress?.emailAddress || "",
    }));
  }

  // Errores en vivo: antes de intentar pagar, solo de los campos tocados; después, de todos.
  const allErrors = useMemo(() => getFieldErrors(values), [values]);
  const errors: CheckoutFieldErrors = wasSubmitted
    ? allErrors
    : Object.fromEntries(Object.entries(allErrors).filter(([field]) => touched.has(field as CheckoutField)));
  const pendingCount = Object.keys(allErrors).length;

  const handleChange = (patch: Partial<CheckoutFormValues>) => {
    setValues((current) => ({ ...current, ...patch }));
  };

  const handleFieldBlur = (field: CheckoutField) => {
    setTouched((current) => (current.has(field) ? current : new Set(current).add(field)));
  };

  const handleSubmit = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (isPaying) return;

    setWasSubmitted(true);
    const firstInvalid = FIELD_ORDER.find((field) => allErrors[field]);
    if (firstInvalid) {
      document.getElementById(checkoutFieldId(firstInvalid))?.focus();
      return;
    }

    setServerError(null);
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof purchaseTicketsAction>>;
      try {
        result = await purchaseTicketsAction({
          eventSlug: event.id,
          selection,
          buyer: {
            fullName: values.fullName,
            email: values.email,
            documentNumber: values.documentNumber,
            phone: values.phone,
          },
        });
      } catch {
        setServerError("No pudimos completar tu compra. Inténtalo de nuevo.");
        return;
      }
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      setRedirecting(true);
      window.location.assign(result.checkoutUrl);
    });
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

  // El botón no se deshabilita por datos incompletos: al pulsarlo marca en rojo lo que falta.
  const canPay = !isPaying;
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
  const termsHint =
    wasSubmitted && pendingCount > 0 ? (
      <span role="alert" className="flex items-center justify-center gap-1.5 text-center text-[0.8125rem] font-medium text-destructive">
        <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
        {pendingCount === 1
          ? "Completa el campo marcado en rojo para continuar."
          : `Completa los ${pendingCount} campos marcados en rojo para continuar.`}
      </span>
    ) : (
      !values.acceptedTerms && (
        <span className="text-center text-[0.8125rem] text-muted-foreground">Acepta los términos para continuar.</span>
      )
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
        <ReservationNotice />
        <CheckoutSummaryCollapsible event={event} summary={summary} ticketsHref={ticketsHref} />
        <CheckoutForm values={values} errors={errors} onChange={handleChange} onFieldBlur={handleFieldBlur} />
        {serverError && (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-2xl bg-destructive/5 p-4 text-sm font-medium text-destructive ring-1 ring-destructive/40"
          >
            <span className="flex items-start gap-2">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {serverError}
            </span>
            <Link href={ticketsHref} className="font-medium underline-offset-4 hover:underline">
              Volver a elegir entradas
            </Link>
          </div>
        )}
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

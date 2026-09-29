"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CircleCheck, Mail, QrCode, Ticket } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import { ConfirmationActions } from "@/modules/checkout/components/confirmation-actions";
import { OrderTicketCard } from "@/modules/checkout/components/order-ticket-card";
import { useOrderStore } from "@/modules/checkout/store/order.store";
import type { EventDetail } from "@/modules/events/types/event.types";
import { usePurchaseStore } from "@/modules/tickets/store/purchase.store";

interface ConfirmationViewProps {
  event: EventDetail;
  className?: string;
}

const NEXT_STEPS = [
  { icon: Mail, title: "Revisa tu correo", text: "Ahí llegan tus entradas y el comprobante de pago." },
  { icon: QrCode, title: "Muestra tu QR", text: "Cada entrada tiene su propio QR. Muéstralo desde tu celular en el ingreso." },
  { icon: Ticket, title: "Todo en Mis entradas", text: "Entra con tu cuenta para ver y descargar tus entradas cuando quieras." },
];

/** Confirmación de compra: lee el último pedido del store (sessionStorage). */
export function ConfirmationView({ event, className }: ConfirmationViewProps) {
  const hydrated = useHydrated();
  const storedOrder = useOrderStore((state) => state.order);
  const order = hydrated && storedOrder?.eventId === event.id ? storedOrder : null;
  const clearSelection = usePurchaseStore((state) => state.clear);
  const selectionEventId = usePurchaseStore((state) => state.eventId);

  // La compra de este evento ya se confirmó: se descarta la selección de entradas.
  useEffect(() => {
    if (order && selectionEventId === event.id) clearSelection();
  }, [order, selectionEventId, event.id, clearSelection]);

  if (!hydrated) {
    return <div aria-busy="true" className="min-h-96" />;
  }

  if (!order) {
    return (
      <div className={cn("mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center", className)}>
        <Ticket className="size-10 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-2xl font-bold tracking-tight">No encontramos tu pedido</h1>
        <p className="text-muted-foreground">
          La confirmación solo está disponible en la pestaña donde hiciste la compra.
        </p>
        <Link
          href={`/events/${event.id}`}
          className={cn(buttonVariants({ variant: "default" }), "h-11 rounded-xl px-5 text-[0.9375rem]")}
        >
          Ir al evento
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("mx-auto flex w-full max-w-4xl flex-col gap-8 lg:gap-10", className)}>
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-accent text-primary">
          <CircleCheck className="size-9" aria-hidden="true" />
        </span>
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">¡Compra confirmada!</h1>
        <p className="max-w-lg text-muted-foreground">
          Enviamos tus entradas a <strong className="font-semibold text-foreground">{order.buyerEmail}</strong>.
          También las tienes siempre en Mis entradas.
        </p>
        <span className="rounded-full bg-muted px-4 py-1.5 text-sm">
          Pedido N.º <strong className="font-semibold">{order.number}</strong>
        </span>
      </div>

      <OrderTicketCard order={order} event={event} />

      <ConfirmationActions order={order} event={event} className="print:hidden" />

      <ol className="grid gap-3 sm:grid-cols-3 print:hidden">
        {NEXT_STEPS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex flex-col gap-2 rounded-2xl border bg-card p-5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="font-semibold">{title}</span>
            <span className="text-sm leading-relaxed text-muted-foreground">{text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

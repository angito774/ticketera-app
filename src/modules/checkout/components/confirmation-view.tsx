"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, Loader2, Mail, QrCode, Ticket } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ConfirmationActions } from "@/modules/checkout/components/confirmation-actions";
import { OrderTicketCard } from "@/modules/checkout/components/order-ticket-card";
import { usePendingOrderRefresh } from "@/modules/checkout/hooks/use-pending-order-refresh";
import type { OrderView } from "@/modules/checkout/services/order-read.service";
import type { EventDetail } from "@/modules/events/types/event.types";
import { usePurchaseStore } from "@/modules/tickets/store/purchase.store";

interface ConfirmationViewProps {
  order: OrderView;
  event: EventDetail;
  className?: string;
}

const NEXT_STEPS = [
  { icon: Mail, title: "Revisa tu correo", text: "Ahí llegan tus entradas y el comprobante de pago." },
  { icon: QrCode, title: "Muestra tu QR", text: "Cada entrada tiene su propio QR. Muéstralo desde tu celular en el ingreso." },
  { icon: Ticket, title: "Todo en Mis entradas", text: "Entra con tu cuenta para ver y descargar tus entradas cuando quieras." },
];

interface StatusMessageProps {
  icon: typeof CircleAlert;
  title: string;
  text: string;
  spinning?: boolean;
  href: string;
  linkLabel: string;
  className?: string;
}

function StatusMessage({ icon: Icon, title, text, spinning, href, linkLabel, className }: StatusMessageProps) {
  return (
    <div
      role="status"
      className={cn("mx-auto flex w-full max-w-md flex-col items-center gap-4 py-12 text-center", className)}
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-accent text-primary">
        <Icon className={cn("size-9", spinning && "animate-spin")} aria-hidden="true" />
      </span>
      <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{title}</h1>
      <p className="text-muted-foreground">{text}</p>
      <Link href={href} className={cn(buttonVariants({ variant: "cta" }), "h-12 rounded-2xl px-6 text-base")}>
        {linkLabel}
      </Link>
    </div>
  );
}

/** Confirmación según el estado real de la orden (ya validada como propia en el servidor). */
export function ConfirmationView({ order, event, className }: ConfirmationViewProps) {
  const router = useRouter();
  const isPending = order.status === "pending";
  const { exhausted } = usePendingOrderRefresh(isPending, () => router.refresh());

  useEffect(() => {
    if (order.status === "paid") usePurchaseStore.getState().clear();
  }, [order.status]);

  if (isPending) {
    return exhausted ? (
      <StatusMessage
        icon={CircleAlert}
        title="Aún no recibimos la confirmación"
        text="Tu pago puede tardar unos minutos en confirmarse. Revisa Mis entradas más tarde."
        href="/my-tickets"
        linkLabel="Ir a Mis entradas"
        className={className}
      />
    ) : (
      <StatusMessage
        spinning
        icon={Loader2}
        title="Confirmando tu pago…"
        text="Estamos esperando la confirmación de Stripe. No cierres esta página."
        href="/my-tickets"
        linkLabel="Ir a Mis entradas"
        className={className}
      />
    );
  }

  if (order.status === "cancelled") {
    return (
      <StatusMessage
        icon={CircleAlert}
        title="El pago no se completó"
        text="El pago no se completó o la reserva expiró. Tus entradas se liberaron; puedes intentarlo de nuevo."
        href={`/events/${order.eventSlug}/tickets`}
        linkLabel="Reintentar compra"
        className={className}
      />
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

"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { formatLongDate, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DecorativeQr } from "@/modules/checkout/components/decorative-qr";
import type { OrderTicketView, OrderView } from "@/modules/checkout/services/order-read.service";
import { EVENT_CATEGORY_LABELS, type Event } from "@/modules/events/types/event.types";

interface OrderTicketCardProps {
  order: OrderView;
  event: Pick<Event, "title" | "imageUrl" | "date" | "venue" | "city" | "category">;
  className?: string;
}

const PAGER_BUTTON_CLASSES =
  "flex size-9 cursor-pointer items-center justify-center rounded-full border bg-background transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring aria-disabled:cursor-not-allowed aria-disabled:opacity-40";

const TICKET_STATUS_LABELS: Record<OrderTicketView["status"], string> = {
  valid: "Válida",
  redeemed: "Usada",
  cancelled: "Cancelada",
};

export function ticketStatusLabel(status: OrderTicketView["status"]): string {
  return TICKET_STATUS_LABELS[status];
}

/** Semilla estable (hash del token) para el QR decorativo. */
export function qrSeedFor(qrCode: string): number {
  let hash = 0;
  for (const char of qrCode) hash = (hash * 31 + char.charCodeAt(0)) % 1_000_003;
  return hash;
}

export function shortTicketCode(qrCode: string): string {
  return qrCode.replace(/-/g, "").slice(0, 8).toUpperCase();
}

/** Entrada con aspecto de ticket: datos del evento a la izquierda y QR (paginable) a la derecha. */
export function OrderTicketCard({ order, event, className }: OrderTicketCardProps) {
  const [index, setIndex] = useState(0);
  const ticket = order.tickets[index];
  const total = order.tickets.length;
  const zones = [...new Set(order.tickets.map((item) => item.zoneName))].join(", ");

  return (
    <article
      aria-label={`Entrada para ${event.title}`}
      className={cn(
        "grid overflow-hidden rounded-3xl border bg-card shadow-[0_20px_40px_-28px_rgb(24_24_27/0.35)] md:grid-cols-[minmax(0,1fr)_260px]",
        className
      )}
    >
      <div className="flex flex-col">
        <div className="relative aspect-[16/7]">
          <Image src={event.imageUrl} alt="" fill sizes="(min-width: 768px) 600px, 100vw" className="object-cover" />
        </div>
        <div className="flex flex-col gap-4 p-5 lg:p-7">
          <div className="flex flex-col gap-1">
            <span className="text-[0.8125rem] font-semibold text-primary">
              {EVENT_CATEGORY_LABELS[event.category].plural}
            </span>
            <h2 className="text-xl font-bold tracking-tight lg:text-2xl">{event.title}</h2>
            <p className="text-sm text-muted-foreground">
              {formatLongDate(event.date)} · {event.venue}, {event.city}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-3 border-t pt-4 text-sm sm:grid-cols-3">
            <div className="col-span-2 flex flex-col gap-0.5 sm:col-span-1">
              <dt className="text-muted-foreground">Zona</dt>
              <dd className="font-semibold">{zones}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Entradas</dt>
              <dd className="font-semibold">{total}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Total pagado</dt>
              <dd className="font-semibold tabular-nums">{formatPrice(order.total)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Talón: separado con línea punteada y muescas, como un ticket físico. */}
      <div className="relative flex flex-col items-center justify-center gap-3 border-t-2 border-dashed bg-muted/50 p-6 md:border-t-0 md:border-l-2">
        <span aria-hidden="true" className="absolute -top-3 -left-3 size-6 rounded-full bg-muted md:-top-3 md:-left-3" />
        <span aria-hidden="true" className="absolute -top-3 -right-3 size-6 rounded-full bg-muted md:top-auto md:-bottom-3 md:-left-3 md:right-auto" />
        <DecorativeQr seed={qrSeedFor(ticket.qrCode)} className="size-40 p-2 shadow-sm" />
        <div className="flex flex-col items-center gap-0.5 text-center">
          <span className="text-sm font-semibold">{ticket.zoneName}</span>
          {ticket.seatLabel && <span className="text-[0.8125rem] text-muted-foreground">{ticket.seatLabel}</span>}
          <span className="font-mono text-[0.8125rem] font-semibold">{shortTicketCode(ticket.qrCode)}</span>
          <span className="text-[0.8125rem] text-primary">{ticketStatusLabel(ticket.status)}</span>
        </div>
        <div className="flex items-center gap-3">
          {total > 1 && (
            <button
              type="button"
              aria-label="Entrada anterior"
              aria-disabled={index === 0}
              onClick={() => {
                if (index > 0) setIndex((current) => current - 1);
              }}
              className={PAGER_BUTTON_CLASSES}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
          )}
          <span aria-live="polite" className="text-[0.8125rem] font-medium text-muted-foreground">
            Entrada {index + 1} de {total}
          </span>
          {total > 1 && (
            <button
              type="button"
              aria-label="Entrada siguiente"
              aria-disabled={index === total - 1}
              onClick={() => {
                if (index < total - 1) setIndex((current) => current + 1);
              }}
              className={PAGER_BUTTON_CLASSES}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

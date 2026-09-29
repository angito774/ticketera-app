"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { formatLongDate, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DecorativeQr } from "@/modules/checkout/components/decorative-qr";
import type { Order } from "@/modules/checkout/types/order.types";
import { EVENT_CATEGORY_LABELS, type Event } from "@/modules/events/types/event.types";

interface OrderTicketCardProps {
  order: Order;
  event: Pick<Event, "title" | "imageUrl" | "date" | "venue" | "city" | "category">;
  className?: string;
}

const PAGER_BUTTON_CLASSES =
  "flex size-9 cursor-pointer items-center justify-center rounded-full border bg-background transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40";

function seedFor(orderNumber: string, index: number): number {
  return Number(orderNumber.replace(/\D/g, "")) * 31 + index;
}

/** Entrada con aspecto de ticket: datos del evento a la izquierda y QR (paginable) a la derecha. */
export function OrderTicketCard({ order, event, className }: OrderTicketCardProps) {
  const [index, setIndex] = useState(0);
  const ticket = order.tickets[index];
  const total = order.tickets.length;
  const zones = [...new Set(order.lines.map((line) => line.zoneName))].join(", ");

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
              <dd className="font-semibold">{order.ticketCount}</dd>
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
        <DecorativeQr seed={seedFor(order.number, index)} className="size-40 p-2 shadow-sm" />
        <div className="flex flex-col items-center gap-0.5 text-center">
          <span className="text-sm font-semibold">{ticket.zoneName}</span>
          {ticket.seatLabel && <span className="text-[0.8125rem] text-muted-foreground">{ticket.seatLabel}</span>}
        </div>
        <div className="flex items-center gap-3">
          {total > 1 && (
            <button
              type="button"
              aria-label="Entrada anterior"
              disabled={index === 0}
              onClick={() => setIndex((current) => current - 1)}
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
              disabled={index === total - 1}
              onClick={() => setIndex((current) => current + 1)}
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

"use client";

import { useState } from "react";
import Image from "next/image";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Printer } from "lucide-react";

import { formatDateBadge, formatLongDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AddToCalendarButton } from "@/modules/checkout/components/add-to-calendar-button";
import { DecorativeQr } from "@/modules/checkout/components/decorative-qr";
import {
  qrSeedFor,
  shortTicketCode,
  ticketStatusLabel,
} from "@/modules/checkout/components/order-ticket-card";
import type { OrderView } from "@/modules/checkout/services/order-read.service";
import type { EventDetail } from "@/modules/events/types/event.types";

interface TicketViewerProps {
  order: OrderView;
  event?: EventDetail;
  className?: string;
}

const PAGER_BUTTON_CLASSES =
  "flex size-9 cursor-pointer items-center justify-center rounded-full border bg-background transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring aria-disabled:cursor-not-allowed aria-disabled:opacity-40";
const ACTION_CLASSES =
  "flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-[1.5px] border-foreground px-3 text-sm whitespace-nowrap font-semibold transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring";

/** Entrada del pedido seleccionado, con QR y paginador. Usar `key={order.id}` para volver a la entrada 1. */
export function TicketViewer({ order, event, className }: TicketViewerProps) {
  const [index, setIndex] = useState(0);
  const ticket = order.tickets[index];
  const total = order.tickets.length;
  const badge = event ? formatDateBadge(event.date) : null;

  return (
    <article
      aria-label={`Entradas para ${order.eventTitle}`}
      className={cn(
        "grid overflow-hidden rounded-3xl border bg-card shadow-[0_20px_40px_-28px_rgb(24_24_27/0.35)] xl:grid-cols-[minmax(0,1fr)_300px]",
        className
      )}
    >
      <div className="flex flex-col">
        {event && badge && (
          <div className="relative aspect-[16/8]">
            <Image src={event.imageUrl} alt="" fill sizes="(min-width: 1280px) 600px, 100vw" className="object-cover" />
            <span className="absolute top-4 left-4 flex w-14 flex-col items-center rounded-xl bg-background py-1.5 leading-none shadow-sm">
              <span className="text-[0.6875rem] font-semibold text-primary">{badge.month}</span>
              <span className="text-xl font-bold">{badge.day}</span>
            </span>
          </div>
        )}
        <div className="flex flex-col gap-3 p-5 lg:p-7">
          <h2 className="text-xl font-bold tracking-tight lg:text-2xl">{order.eventTitle}</h2>
          {event && (
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
                {formatLongDate(event.date)} · {formatTime(event.date)} h
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="size-4 shrink-0" aria-hidden="true" />
                {event.venue}, {event.city}
              </li>
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 border-t-2 border-dashed bg-muted/50 p-5 lg:p-7 xl:border-t-0 xl:border-l-2">
        <DecorativeQr seed={qrSeedFor(ticket.qrCode)} className="size-44 p-2 shadow-sm" />

        <div className="flex items-center gap-3">
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
          <span aria-live="polite" className="text-sm font-medium">
            Entrada {index + 1} de {total}
          </span>
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
        </div>

        <dl className="grid w-full grid-cols-2 gap-x-4 gap-y-3 border-t pt-4 text-sm">
          <div className="col-span-2 flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Zona</dt>
            <dd className="font-semibold">
              {ticket.zoneName}
              {ticket.seatLabel && <span className="font-normal text-muted-foreground"> · {ticket.seatLabel}</span>}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Titular</dt>
            <dd className="font-semibold">{order.buyerName}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Estado</dt>
            <dd className="font-semibold text-primary">{ticketStatusLabel(ticket.status)}</dd>
          </div>
          <div className="col-span-2 flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Código</dt>
            <dd className="font-mono font-semibold">{shortTicketCode(ticket.qrCode)}</dd>
          </div>
        </dl>

        <div className="flex w-full gap-2 print:hidden">
          <button type="button" onClick={() => window.print()} className={ACTION_CLASSES}>
            <Printer className="size-4.5" aria-hidden="true" />
            <span>Imprimir</span>
          </button>
          {event && <AddToCalendarButton order={order} event={event} label="Calendario" className={ACTION_CLASSES} />}
        </div>
      </div>
    </article>
  );
}

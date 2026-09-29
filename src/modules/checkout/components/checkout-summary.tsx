"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { formatPrice, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Event } from "@/modules/events/types/event.types";
import type { PurchaseSummary } from "@/modules/tickets/store/purchase.store";

type SummaryEvent = Pick<Event, "title" | "imageUrl" | "date" | "venue" | "city">;

interface CheckoutSummaryProps {
  event: SummaryEvent;
  summary: PurchaseSummary;
  ticketsHref: string;
  /** Botón de pago (solo en la versión de escritorio; en móvil va en la barra inferior). */
  action?: ReactNode;
  className?: string;
}

function ticketCountLabel(count: number): string {
  return count === 1 ? "1 entrada" : `${count} entradas`;
}

function EventThumbnail({ event, className }: { event: SummaryEvent; className?: string }) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-xl", className)}>
      <Image src={event.imageUrl} alt="" fill sizes="64px" className="object-cover" />
    </div>
  );
}

function SummaryLines({ summary, ticketsHref }: Pick<CheckoutSummaryProps, "summary" | "ticketsHref">) {
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {summary.lines.map((line) => (
          <li key={line.zoneId} className="flex flex-col gap-0.5">
            <span className="flex justify-between gap-3 text-[0.9375rem]">
              <span>
                {line.quantity} × {line.zoneName}
              </span>
              <span className="font-semibold tabular-nums">{formatPrice(line.amount)}</span>
            </span>
            {line.seatLabels.map((label) => (
              <span key={label} className="text-[0.8125rem] text-muted-foreground">
                {label}
              </span>
            ))}
          </li>
        ))}
      </ul>
      <Link
        href={ticketsHref}
        className="w-fit cursor-pointer text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        Cambiar entradas
      </Link>
    </div>
  );
}

/** Resumen lateral del checkout (escritorio). */
export function CheckoutSummary({ event, summary, ticketsHref, action, className }: CheckoutSummaryProps) {
  return (
    <aside
      aria-label="Resumen de la compra"
      className={cn(
        "hidden flex-col gap-5 rounded-3xl border bg-card p-7 shadow-[0_20px_40px_-28px_rgb(24_24_27/0.35)] lg:sticky lg:top-24 lg:flex",
        className
      )}
    >
      <div className="flex items-center gap-3.5 border-b pb-5">
        <EventThumbnail event={event} className="size-16" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-semibold leading-snug">{event.title}</span>
          <span className="text-[0.8125rem] text-muted-foreground">
            {formatShortDate(event.date)} · {event.venue}, {event.city}
          </span>
        </div>
      </div>
      <SummaryLines summary={summary} ticketsHref={ticketsHref} />
      <div className="flex items-baseline justify-between border-t-[1.5px] border-dashed pt-4.5">
        <span className="text-[0.9375rem] font-medium">
          Total{" "}
          <span className="font-normal text-muted-foreground">({ticketCountLabel(summary.ticketCount)})</span>
        </span>
        <span className="text-3xl font-bold tracking-tight tabular-nums">{formatPrice(summary.total)}</span>
      </div>
      {action}
    </aside>
  );
}

/** Resumen plegable del checkout (móvil). */
export function CheckoutSummaryCollapsible({ event, summary, ticketsHref, className }: CheckoutSummaryProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section aria-label="Resumen de la compra" className={cn("rounded-3xl border bg-card lg:hidden", className)}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="checkout-summary-details"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full cursor-pointer items-center gap-3 rounded-3xl p-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring"
      >
        <EventThumbnail event={event} className="size-12" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold">{event.title}</span>
          <span className="text-sm text-muted-foreground">
            {ticketCountLabel(summary.ticketCount)} · {formatPrice(summary.total)}
          </span>
        </span>
        <ChevronDown
          className={cn("size-5 shrink-0 transition-transform duration-200", isOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {isOpen && (
        <div id="checkout-summary-details" className="flex flex-col gap-3 border-t px-4 pt-3 pb-4">
          <span className="text-[0.8125rem] text-muted-foreground">
            {formatShortDate(event.date)} · {event.venue}, {event.city}
          </span>
          <SummaryLines summary={summary} ticketsHref={ticketsHref} />
        </div>
      )}
    </section>
  );
}

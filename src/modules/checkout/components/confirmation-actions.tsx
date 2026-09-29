"use client";

import Link from "next/link";
import { ArrowRight, CalendarPlus, Download } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { buildCalendarFile } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import type { Order } from "@/modules/checkout/types/order.types";
import type { EventDetail } from "@/modules/events/types/event.types";

interface ConfirmationActionsProps {
  order: Order;
  event: Pick<EventDetail, "title" | "date" | "venue" | "address" | "city">;
  className?: string;
}

const SECONDARY_CLASSES =
  "flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border-[1.5px] border-foreground px-5 text-[0.9375rem] font-semibold transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring";

export function ConfirmationActions({ order, event, className }: ConfirmationActionsProps) {
  const downloadCalendar = () => {
    const content = buildCalendarFile({
      id: order.number,
      title: event.title,
      start: event.date,
      location: `${event.venue}, ${event.address}, ${event.city}`,
      description: `Pedido ${order.number} · ${order.ticketCount} ${order.ticketCount === 1 ? "entrada" : "entradas"}`,
    });
    const url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${order.number}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center", className)}>
      <Link
        href="/my-tickets"
        className={cn(buttonVariants({ variant: "default" }), "h-12 gap-2 rounded-2xl px-5 text-[0.9375rem] font-semibold")}
      >
        Ver mis entradas
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
      <button type="button" onClick={downloadCalendar} className={SECONDARY_CLASSES}>
        <CalendarPlus className="size-4.5" aria-hidden="true" />
        Agregar al calendario
      </button>
      <button type="button" onClick={() => window.print()} className={SECONDARY_CLASSES}>
        <Download className="size-4.5" aria-hidden="true" />
        Descargar PDF
      </button>
    </div>
  );
}

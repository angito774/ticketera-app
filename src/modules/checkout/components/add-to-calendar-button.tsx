"use client";

import { CalendarPlus } from "lucide-react";

import { buildCalendarFile } from "@/lib/calendar";
import type { Order } from "@/modules/checkout/types/order.types";
import type { EventDetail } from "@/modules/events/types/event.types";

interface AddToCalendarButtonProps {
  order: Order;
  event: Pick<EventDetail, "title" | "date" | "venue" | "address" | "city">;
  label?: string;
  className?: string;
}

/** Descarga un `.ics` con el evento del pedido. */
export function AddToCalendarButton({
  order,
  event,
  label = "Agregar al calendario",
  className,
}: AddToCalendarButtonProps) {
  const download = () => {
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
    <button type="button" onClick={download} className={className}>
      <CalendarPlus className="size-4.5" aria-hidden="true" />
      {label}
    </button>
  );
}

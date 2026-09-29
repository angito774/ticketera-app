import Image from "next/image";

import { formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Order } from "@/modules/checkout/types/order.types";
import type { EventDetail } from "@/modules/events/types/event.types";

interface OrderListProps {
  orders: Order[];
  events: Record<string, EventDetail>;
  selectedNumber: string | null;
  onSelect: (orderNumber: string) => void;
  className?: string;
}

function summaryLabel(order: Order): string {
  const count = order.ticketCount === 1 ? "1 entrada" : `${order.ticketCount} entradas`;
  const zones = [...new Set(order.lines.map((line) => line.zoneName))].join(", ");
  return `${count} · ${zones}`;
}

/** Pedidos del usuario: columna en escritorio, carrusel horizontal en móvil. */
export function OrderList({ orders, events, selectedNumber, onSelect, className }: OrderListProps) {
  return (
    <ul
      aria-label="Pedidos"
      className={cn(
        "-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0",
        className
      )}
    >
      {orders.map((order) => {
        const event = events[order.eventId];
        if (!event) return null;
        const isSelected = order.number === selectedNumber;
        return (
          <li key={order.number} className="w-72 shrink-0 lg:w-auto">
            <button
              type="button"
              aria-current={isSelected ? "true" : undefined}
              onClick={() => onSelect(order.number)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-3.5 rounded-2xl border-[1.5px] bg-card p-3 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring",
                isSelected ? "border-primary" : "border-border"
              )}
            >
              <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                <Image src={event.imageUrl} alt="" fill sizes="64px" className="object-cover" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-semibold">{event.title}</span>
                <span className="text-[0.8125rem] text-muted-foreground">
                  {formatShortDate(event.date)} · {event.city}
                </span>
                <span className="truncate text-[0.8125rem] text-muted-foreground">{summaryLabel(order)}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

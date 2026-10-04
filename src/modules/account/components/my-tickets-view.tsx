"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarX, Ticket } from "lucide-react";
import type { ComponentType } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OrderList } from "@/modules/account/components/order-list";
import { TicketViewer } from "@/modules/account/components/ticket-viewer";
import type { OrderView } from "@/modules/checkout/services/order-read.service";
import type { EventDetail } from "@/modules/events/types/event.types";

interface MyTicketsViewProps {
  orders: OrderView[];
  events: Record<string, EventDetail>;
}

type Tab = "upcoming" | "past";

function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  text: string;
  action: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border-[1.5px] border-dashed px-6 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-primary">
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <span className="text-lg font-semibold">{title}</span>
      <span className="text-sm text-muted-foreground">{text}</span>
      <Link href={action.href} className={cn(buttonVariants(), "mt-2 h-11 rounded-xl px-5 text-[0.9375rem]")}>
        {action.label}
      </Link>
    </div>
  );
}

/** Divide por fecha del evento (sin fecha conocida cuenta como próxima) y ordena más recientes primero. */
function splitOrders(orders: OrderView[], events: Record<string, EventDetail>, now: Date) {
  const sorted = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const upcoming: OrderView[] = [];
  const past: OrderView[] = [];
  for (const order of sorted) {
    const event = events[order.eventSlug];
    (event && new Date(event.date).getTime() < now.getTime() ? past : upcoming).push(order);
  }
  return { upcoming, past };
}

/** Mis entradas: órdenes reales del usuario, separadas en próximas y pasadas. */
export function MyTicketsView({ orders: allOrders, events }: MyTicketsViewProps) {
  const [now] = useState(() => new Date());
  const [tab, setTab] = useState<Tab>("upcoming");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { upcoming, past } = useMemo(() => splitOrders(allOrders, events, now), [allOrders, events, now]);

  if (allOrders.length === 0) {
    return (
      <div className="flex flex-col gap-6 lg:gap-8">
        <h1 className="text-2xl font-bold tracking-tight lg:text-4xl">Mis entradas</h1>
        <EmptyState
          icon={Ticket}
          title="Aún no tienes entradas"
          text="Las entradas que compres aparecerán aquí."
          action={{ href: "/events", label: "Explorar eventos" }}
        />
      </div>
    );
  }

  const orders = tab === "upcoming" ? upcoming : past;
  const selected = orders.find((order) => order.id === selectedId) ?? orders[0];
  const tabs: { key: Tab; label: string }[] = [
    { key: "upcoming", label: `Próximas (${upcoming.length})` },
    { key: "past", label: `Pasadas (${past.length})` },
  ];

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight lg:text-4xl">Mis entradas</h1>
        <div className="flex rounded-xl border bg-background p-1">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={tab === item.key}
              onClick={() => setTab(item.key)}
              className={cn(
                "h-9 cursor-pointer rounded-lg px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring",
                tab === item.key ? "bg-foreground text-background" : "hover:bg-muted"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {!selected ? (
        tab === "past" ? (
          <EmptyState
            icon={CalendarX}
            title="Aún no tienes eventos pasados"
            text="Cuando vayas a tu primer evento, lo verás aquí."
            action={{ href: "/events", label: "Explorar eventos" }}
          />
        ) : (
          <EmptyState
            icon={Ticket}
            title="Aún no tienes entradas próximas"
            text="Las entradas de tus próximos eventos aparecerán aquí."
            action={{ href: "/events", label: "Explorar eventos" }}
          />
        )
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-8">
          <OrderList
            orders={orders}
            events={events}
            selectedId={selected.id}
            onSelect={setSelectedId}
          />
          <TicketViewer key={selected.id} order={selected} event={events[selected.eventSlug]} />
        </div>
      )}
    </div>
  );
}

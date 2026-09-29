import type { ComponentType } from "react";
import { CalendarCheck, Ticket, Wallet } from "lucide-react";

import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

interface SummaryKpisProps {
  sold: number;
  revenue: number;
  published: number;
  className?: string;
}

const numberFormatter = new Intl.NumberFormat("es-PE");

export function SummaryKpis({ sold, revenue, published, className }: SummaryKpisProps) {
  const items: { label: string; value: string; icon: ComponentType<{ className?: string }> }[] = [
    { label: "Entradas vendidas", value: numberFormatter.format(sold), icon: Ticket },
    { label: "Ingresos", value: formatPrice(revenue), icon: Wallet },
    { label: "Eventos publicados", value: numberFormatter.format(published), icon: CalendarCheck },
  ];

  return (
    <dl className={cn("grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-5", className)}>
      {items.map(({ label, value, icon: Icon }, index) => (
        <div
          key={label}
          className={cn(
            "flex flex-col gap-2 rounded-3xl border bg-card p-4 lg:p-6",
            // En móvil los ingresos ocupan la fila completa (valor más largo).
            index === 1 && "col-span-2 row-start-1 lg:col-span-1 lg:row-start-auto"
          )}
        >
          <dt className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-primary">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            {label}
          </dt>
          <dd className="text-2xl font-bold tracking-tight tabular-nums lg:text-3xl">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

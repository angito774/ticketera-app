import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { StickyBottomBar } from "@/components/sticky-bottom-bar";
import { buttonVariants } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ZonePriceList } from "@/modules/tickets/components/zone-price-list";
import type { VenueZone } from "@/modules/tickets/types/venue.types";

interface TicketPricesCardProps {
  zones: VenueZone[];
  fromPrice: number;
  ticketsHref: string;
  className?: string;
}

/**
 * Precios por zona del detalle de evento: tarjeta lateral fija en escritorio y,
 * en móvil, sección "Entradas" + barra inferior con el CTA de compra.
 */
export function TicketPricesCard({
  zones,
  fromPrice,
  ticketsHref,
  className,
}: TicketPricesCardProps) {
  const formattedFrom = formatPrice(fromPrice);

  return (
    <>
      <aside
        aria-label="Entradas"
        className={cn(
          "flex flex-col gap-5 rounded-3xl border bg-card p-5 shadow-[0_20px_40px_-28px_rgb(24_24_27/0.35)] lg:sticky lg:top-24 lg:p-7",
          className
        )}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-[0.8125rem] text-muted-foreground">
            Entradas desde
          </span>
          <span className="text-3xl font-bold tracking-tight text-primary">
            {formattedFrom}
          </span>
        </div>
        <ZonePriceList zones={zones} />
        <Link
          href={ticketsHref}
          className={cn(
            buttonVariants({ variant: "cta" }),
            "hidden h-14 rounded-2xl text-base lg:flex"
          )}
        >
          Elegir entradas
          <ArrowRight className="size-4.5" aria-hidden="true" />
        </Link>
        <p className="flex items-center justify-center gap-2 text-[0.8125rem] text-muted-foreground">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Pago seguro · Entrada digital con QR
        </p>
      </aside>

      <StickyBottomBar>
        <span className="flex flex-col">
          <span className="text-xs text-muted-foreground">Desde</span>
          <span className="text-xl font-bold tracking-tight">
            {formattedFrom}
          </span>
        </span>
        <Link
          href={ticketsHref}
          className={cn(
            buttonVariants({ variant: "cta" }),
            "h-12 flex-1 rounded-2xl text-base sm:max-w-60"
          )}
        >
          Comprar entradas
          <ArrowRight className="size-4.5" aria-hidden="true" />
        </Link>
      </StickyBottomBar>
    </>
  );
}

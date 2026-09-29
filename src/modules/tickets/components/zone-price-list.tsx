import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getZoneToneClasses } from "@/modules/tickets/components/zone-tones";
import { ZoneStatusBadge } from "@/modules/tickets/components/zone-status-badge";
import type { VenueZone } from "@/modules/tickets/types/venue.types";

interface ZonePriceListProps {
  zones: VenueZone[];
  className?: string;
}

/** Precios por zona (solo lectura), para el detalle del evento. */
export function ZonePriceList({ zones, className }: ZonePriceListProps) {
  return (
    <ul className={cn("flex flex-col border-t", className)}>
      {zones.map((zone) => {
        const isSoldOut = zone.status === "sold-out";
        return (
          <li
            key={zone.id}
            className="flex min-h-14 items-center justify-between gap-3 border-b"
          >
            <span className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={cn(
                  "size-3 shrink-0 rounded",
                  getZoneToneClasses(zone).swatch
                )}
              />
              <span
                className={cn(
                  "text-[0.9375rem] font-medium",
                  isSoldOut && "text-muted-foreground"
                )}
              >
                {zone.name}
              </span>
              <ZoneStatusBadge status={zone.status} />
            </span>
            {isSoldOut ? (
              <span className="text-sm font-semibold text-muted-foreground">
                Agotado
              </span>
            ) : (
              <span className="text-[0.9375rem] font-semibold tabular-nums">
                {formatPrice(zone.price)}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

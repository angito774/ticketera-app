import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getZoneToneClasses } from "@/modules/tickets/components/zone-tones";
import type { VenueZone } from "@/modules/tickets/types/venue.types";

interface ZoneLegendProps {
  zones: VenueZone[];
  activeZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
  /** Resalta la zona en el mapa al pasar el mouse o enfocar su pastilla (null al salir). */
  onHighlightZone: (zoneId: string | null) => void;
  className?: string;
}

/** Leyenda de precios: una pastilla por zona que resalta y selecciona su zona en el mapa. */
export function ZoneLegend({ zones, activeZoneId, onSelectZone, onHighlightZone, className }: ZoneLegendProps) {
  return (
    <ul aria-label="Precios por zona" className={cn("-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:overflow-visible", className)}>
      {zones.map((zone) => {
        const isSoldOut = zone.status === "sold-out";
        const isActive = zone.id === activeZoneId;
        return (
          <li key={zone.id} className="shrink-0">
            <button
              type="button"
              disabled={isSoldOut}
              aria-pressed={isSoldOut ? undefined : isActive}
              onClick={() => onSelectZone(zone.id)}
              onPointerEnter={() => onHighlightZone(zone.id)}
              onPointerLeave={() => onHighlightZone(null)}
              onFocus={() => onHighlightZone(zone.id)}
              onBlur={() => onHighlightZone(null)}
              className={cn(
                "flex h-9 cursor-pointer items-center gap-2 rounded-full border border-white/15 px-3 text-[0.8125rem] font-medium whitespace-nowrap text-white/85 transition-colors outline-none hover:border-white/40 hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                isActive && "border-white bg-white text-brand-deep hover:bg-white"
              )}
            >
              <span aria-hidden="true" className={cn("size-2.5 rounded-full", isSoldOut ? "bg-white/30" : getZoneToneClasses(zone).swatch)} />
              {zone.shortName}
              <span className={cn("tabular-nums", isActive ? "text-brand-deep/70" : "text-white/55")}>
                {isSoldOut ? "Agotado" : formatPrice(zone.price)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

"use client";

import type { KeyboardEvent } from "react";

import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getZoneToneClasses } from "@/modules/tickets/components/zone-tones";
import type { VenueLayout, VenueZone } from "@/modules/tickets/types/venue.types";

interface VenueMapProps {
  layout: VenueLayout;
  activeZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
  className?: string;
}

const ZONE_RADIUS = 10;

function zoneLabel(zone: VenueZone): string {
  if (zone.status === "sold-out") return `${zone.name}, agotado`;
  const seating = zone.seating === "numbered" ? ", asientos numerados" : "";
  return `${zone.name}, ${formatPrice(zone.price)}${seating}`;
}

/** Mapa del recinto en SVG: una forma por zona, seleccionable con mouse, toque o teclado. */
export function VenueMap({
  layout,
  activeZoneId,
  onSelectZone,
  className,
}: VenueMapProps) {
  const { viewBox, stage } = layout;

  const handleKeyDown = (event: KeyboardEvent<SVGGElement>, zoneId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectZone(zoneId);
    }
  };

  return (
    <svg
      viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
      role="group"
      aria-label="Mapa de zonas del recinto"
      className={cn("h-auto w-full select-none", className)}
    >
      <g aria-hidden="true">
        <rect
          x={stage.x}
          y={stage.y}
          width={stage.width}
          height={stage.height}
          rx={ZONE_RADIUS}
          className="fill-foreground"
        />
        <text
          x={stage.x + stage.width / 2}
          y={stage.y + stage.height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-background text-[10px] font-bold tracking-[0.16em]"
        >
          ESCENARIO
        </text>
      </g>

      {layout.zones.map((zone) => {
        const { shape } = zone;
        const isSoldOut = zone.status === "sold-out";
        const isActive = zone.id === activeZoneId;
        const tone = getZoneToneClasses(zone);
        const centerX = shape.x + shape.width / 2;
        const centerY = shape.y + shape.height / 2;
        // Tribunas angostas: nombre corto para que entre en la forma.
        const name = shape.width < 120 ? zone.shortName : zone.name;

        return (
          <g
            key={zone.id}
            role={isSoldOut ? "img" : "button"}
            tabIndex={isSoldOut ? undefined : 0}
            aria-pressed={isSoldOut ? undefined : isActive}
            aria-label={zoneLabel(zone)}
            onClick={isSoldOut ? undefined : () => onSelectZone(zone.id)}
            onKeyDown={isSoldOut ? undefined : (event) => handleKeyDown(event, zone.id)}
            className={cn(
              "group/zone outline-none",
              isSoldOut ? "cursor-not-allowed" : "cursor-pointer"
            )}
          >
            <rect
              x={shape.x + 1.5}
              y={shape.y + 1.5}
              width={shape.width - 3}
              height={shape.height - 3}
              rx={ZONE_RADIUS}
              className={cn(
                tone.fill,
                "stroke-[3] transition-[stroke,opacity] duration-200",
                isActive ? "stroke-foreground" : "stroke-transparent",
                !isSoldOut && "group-hover/zone:opacity-85",
                "group-focus-visible/zone:stroke-ring"
              )}
            />
            <text
              x={centerX}
              y={centerY - 7}
              textAnchor="middle"
              dominantBaseline="central"
              className={cn(tone.textFill, "pointer-events-none text-[13px] font-semibold")}
            >
              {name}
            </text>
            <text
              x={centerX}
              y={centerY + 9}
              textAnchor="middle"
              dominantBaseline="central"
              className={cn(tone.textFill, "pointer-events-none text-[12px]")}
            >
              {isSoldOut ? "Agotado" : formatPrice(zone.price)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

"use client";

import { useId, type KeyboardEvent } from "react";

import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MapTooltip, useMapTooltip } from "@/modules/tickets/components/map-tooltip";
import { getZoneToneClasses } from "@/modules/tickets/components/zone-tones";
import type { VenueLayout, VenueZone } from "@/modules/tickets/types/venue.types";

interface VenueMapProps {
  layout: VenueLayout;
  activeZoneId: string | null;
  /** Zona resaltada desde la leyenda (hover/foco). */
  highlightedZoneId?: string | null;
  onSelectZone: (zoneId: string) => void;
  className?: string;
}

const STATUS_LABELS: Record<VenueZone["status"], string> = {
  available: "Disponible",
  "last-tickets": "Quedan pocas",
  "sold-out": "Agotado",
};

function zoneLabel(zone: VenueZone): string {
  if (zone.status === "sold-out") return `${zone.name}, agotado`;
  const seating = zone.seating === "numbered" ? ", asientos numerados" : "";
  return `${zone.name}, ${formatPrice(zone.price)}${seating}`;
}

/** Ancho aproximado de un texto SVG (Poppins) para dimensionar la pastilla de precio. */
const textWidth = (text: string, fontSize: number) => text.length * fontSize * 0.58;

function ZoneTooltipContent({ zone }: { zone: VenueZone }) {
  return (
    <span className="flex flex-col gap-0.5">
      <strong className="font-semibold">{zone.name}</strong>
      <span className="flex items-center gap-2">
        <span className="font-semibold text-primary tabular-nums">{formatPrice(zone.price)}</span>
        <span className="text-muted-foreground">·</span>
        <span className={cn(zone.status === "last-tickets" ? "text-warning-foreground" : "text-muted-foreground")}>
          {STATUS_LABELS[zone.status]}
        </span>
      </span>
      <span className="text-xs text-muted-foreground">
        {zone.seating === "numbered" ? "Asientos numerados" : "General de pie"}
      </span>
    </span>
  );
}

/**
 * Mapa del recinto en modo noche: escenario con haz de luz, tribunas curvas o bandas en
 * abanico, pastillas de precio, rayado en agotadas y tooltip con el detalle (solo mouse).
 */
export function VenueMap({ layout, activeZoneId, highlightedZoneId = null, onSelectZone, className }: VenueMapProps) {
  const id = useId().replace(/:/g, "");
  const { containerRef, tooltip, show, hide } = useMapTooltip();
  const { viewBox, stage } = layout;
  const focusZoneId = highlightedZoneId ?? activeZoneId;

  const stageBottom = stage.bounds.y + stage.bounds.height;
  const stageCenter = stage.bounds.x + stage.bounds.width / 2;
  const beamSpread = stage.bounds.width * 0.9;

  const handleKeyDown = (event: KeyboardEvent<SVGGElement>, zoneId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectZone(zoneId);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
        role="group"
        aria-label="Mapa de zonas del recinto"
        className="h-auto w-full overflow-visible select-none"
      >
        <defs>
          <pattern id={`${id}-hatch`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" className="stroke-white/20" strokeWidth="2" />
          </pattern>
          <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.22" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-stage`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" />
            <stop offset="100%" stopColor="white" stopOpacity="0.8" />
          </linearGradient>
          <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Haz de luz desde el escenario */}
        <polygon
          aria-hidden="true"
          points={`${stageCenter - stage.bounds.width / 2 + 10},${stageBottom} ${stageCenter + stage.bounds.width / 2 - 10},${stageBottom} ${stageCenter + beamSpread},${stageBottom + 150} ${stageCenter - beamSpread},${stageBottom + 150}`}
          fill={`url(#${id}-beam)`}
        />

        <g aria-hidden="true" filter={`url(#${id}-glow)`}>
          <path d={stage.path} fill={`url(#${id}-stage)`} />
          <text
            x={stage.label.x}
            y={stage.label.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-brand-deep text-[9px] font-bold tracking-[0.2em]"
          >
            ESCENARIO
          </text>
        </g>

        {layout.zones.map((zone) => {
          const { shape } = zone;
          const isSoldOut = zone.status === "sold-out";
          const isActive = zone.id === activeZoneId;
          const isHighlighted = zone.id === highlightedZoneId;
          const isDimmed = focusZoneId !== null && zone.id !== focusZoneId;
          const tone = getZoneToneClasses(zone);
          const narrow = shape.bounds.width < 110;
          const name = narrow ? zone.shortName : zone.name;
          const price = isSoldOut ? "Agotado" : formatPrice(zone.price);
          const pillWidth = textWidth(price, 9) + 14;

          return (
            <g
              key={zone.id}
              role={isSoldOut ? "img" : "button"}
              tabIndex={isSoldOut ? undefined : 0}
              aria-pressed={isSoldOut ? undefined : isActive}
              aria-label={zoneLabel(zone)}
              onClick={isSoldOut ? undefined : () => onSelectZone(zone.id)}
              onKeyDown={isSoldOut ? undefined : (event) => handleKeyDown(event, zone.id)}
              onPointerMove={isSoldOut ? undefined : (event) => show(event, <ZoneTooltipContent zone={zone} />)}
              onPointerLeave={hide}
              className={cn(
                "group/zone outline-none transition-opacity duration-200 motion-reduce:transition-none",
                isSoldOut ? "cursor-not-allowed" : "cursor-pointer",
                isDimmed && "opacity-45"
              )}
            >
              {/* Halo de foco por teclado: blanco fuera de la zona, así se ve sobre cualquier tono de relleno (contraste ~16:1 contra el fondo del mapa). */}
              <path
                aria-hidden="true"
                d={shape.path}
                className="pointer-events-none fill-none stroke-white stroke-[6] opacity-0 group-focus-visible/zone:opacity-100"
              />
              <path
                d={shape.path}
                filter={isActive ? `url(#${id}-glow)` : undefined}
                className={cn(
                  tone.fill,
                  "stroke-[2.5] transition-[stroke,filter] duration-200 motion-reduce:transition-none",
                  isActive ? "stroke-white" : isHighlighted ? "stroke-white/80" : "stroke-brand-deep",
                  !isSoldOut && !isActive && "group-hover/zone:stroke-white/70"
                )}
              />
              {isSoldOut && <path d={shape.path} fill={`url(#${id}-hatch)`} className="pointer-events-none" />}
              <text
                x={shape.label.x}
                y={shape.label.y - 7}
                textAnchor="middle"
                dominantBaseline="central"
                className={cn(tone.textFill, "pointer-events-none text-[11px] font-semibold")}
              >
                {name}
              </text>
              <g className="pointer-events-none">
                <rect
                  x={shape.label.x - pillWidth / 2}
                  y={shape.label.y + 2}
                  width={pillWidth}
                  height={14}
                  rx={7}
                  className="fill-brand-deep/80"
                />
                <text
                  x={shape.label.x}
                  y={shape.label.y + 9}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={cn("text-[9px] font-semibold", isSoldOut ? "fill-white/75" : "fill-white")}
                >
                  {price}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
      <MapTooltip tooltip={tooltip} />
    </div>
  );
}

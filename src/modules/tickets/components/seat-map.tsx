"use client";

import type { KeyboardEvent } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

import { cn } from "@/lib/utils";
import {
  ROW_LABEL_GUTTER,
  ROW_SPACING,
  SEAT_SPACING,
} from "@/modules/tickets/services/venues.service";
import type { Seat, VenueZone } from "@/modules/tickets/types/venue.types";

interface SeatMapProps {
  zone: VenueZone;
  selectedSeatIds: string[];
  /** Con el máximo alcanzado, los asientos libres no seleccionados quedan deshabilitados. */
  maxReached: boolean;
  onToggleSeat: (seat: Seat) => void;
  className?: string;
}

const SEAT_RADIUS = 9;

const LEGEND = [
  { label: "Disponible", className: "border-[1.5px] border-muted-foreground/60 bg-background" },
  { label: "Seleccionado", className: "bg-primary" },
  { label: "Ocupado", className: "bg-border" },
];

const CONTROL_CLASSES =
  "flex size-9 cursor-pointer items-center justify-center rounded-lg border bg-background text-foreground shadow-sm transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring";

/** Mapa de asientos de una zona numerada, con zoom y desplazamiento (pinch, arrastre, rueda o botones). */
export function SeatMap({
  zone,
  selectedSeatIds,
  maxReached,
  onToggleSeat,
  className,
}: SeatMapProps) {
  const seatsPerRow = Math.max(...zone.rows.map((row) => row.seats.length));
  const width = ROW_LABEL_GUTTER * 2 + seatsPerRow * SEAT_SPACING;
  const height = zone.rows.length * ROW_SPACING;

  const handleKeyDown = (event: KeyboardEvent<SVGGElement>, seat: Seat) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggleSeat(seat);
    }
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <TransformWrapper minScale={0.5} maxScale={4} centerOnInit doubleClick={{ disabled: true }}>
        {({ zoomIn, zoomOut, resetTransform }) => (
          <div className="relative overflow-hidden rounded-2xl bg-muted/60">
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
              <button type="button" aria-label="Acercar" onClick={() => zoomIn()} className={CONTROL_CLASSES}>
                <Plus className="size-4" aria-hidden="true" />
              </button>
              <button type="button" aria-label="Alejar" onClick={() => zoomOut()} className={CONTROL_CLASSES}>
                <Minus className="size-4" aria-hidden="true" />
              </button>
              <button type="button" aria-label="Restablecer zoom" onClick={() => resetTransform()} className={CONTROL_CLASSES}>
                <RotateCcw className="size-4" aria-hidden="true" />
              </button>
            </div>

            <TransformComponent
              wrapperClass="!w-full cursor-grab active:cursor-grabbing"
              contentClass="!w-full"
            >
              <div className="flex w-full min-w-fit flex-col gap-3 px-4 pt-4 pb-5 sm:px-8">
                <div
                  aria-hidden="true"
                  className="mx-auto w-2/3 rounded-lg bg-foreground py-1.5 text-center text-[0.625rem] font-bold tracking-[0.16em] text-background"
                >
                  ESCENARIO
                </div>
                {/* Ancho mínimo para que cada asiento sea un blanco táctil usable (~26px);
                    en pantallas angostas el mapa se recorre arrastrando. */}
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  role="group"
                  aria-label={`Asientos de ${zone.name}`}
                  className="h-auto w-full select-none"
                  style={{ minWidth: width * 1.1 }}
                >
                  {zone.rows.map((row) => (
                    <g key={row.label}>
                      <text
                        x={ROW_LABEL_GUTTER / 2}
                        y={row.seats[0].y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        aria-hidden="true"
                        className="fill-muted-foreground text-[11px] font-semibold"
                      >
                        {row.label}
                      </text>
                      <text
                        x={width - ROW_LABEL_GUTTER / 2}
                        y={row.seats[0].y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        aria-hidden="true"
                        className="fill-muted-foreground text-[11px] font-semibold"
                      >
                        {row.label}
                      </text>

                      {row.seats.map((seat) => {
                        const isTaken = seat.status === "taken";
                        const isSelected = selectedSeatIds.includes(seat.id);
                        const isDisabled = isTaken || (maxReached && !isSelected);
                        const label = `Fila ${seat.row}, asiento ${seat.number}${isTaken ? ", ocupado" : ""}`;

                        return (
                          <g
                            key={seat.id}
                            role="button"
                            tabIndex={isDisabled ? -1 : 0}
                            aria-label={label}
                            aria-pressed={isSelected}
                            aria-disabled={isDisabled || undefined}
                            onClick={isDisabled ? undefined : () => onToggleSeat(seat)}
                            onKeyDown={isDisabled ? undefined : (event) => handleKeyDown(event, seat)}
                            className={cn(
                              "group/seat outline-none",
                              isDisabled ? "cursor-not-allowed" : "cursor-pointer"
                            )}
                          >
                            <circle
                              cx={seat.x}
                              cy={seat.y}
                              r={SEAT_RADIUS}
                              className={cn(
                                "transition-colors duration-150",
                                isTaken && "fill-border",
                                isSelected && "fill-primary",
                                !isTaken && !isSelected && "fill-background stroke-muted-foreground/60 stroke-[1.5]",
                                !isTaken && !isSelected && maxReached && "opacity-40",
                                !isDisabled && !isSelected && "group-hover/seat:fill-accent group-hover/seat:stroke-primary",
                                "group-focus-visible/seat:stroke-ring group-focus-visible/seat:stroke-[3]"
                              )}
                            />
                            {isSelected && (
                              <text
                                x={seat.x}
                                y={seat.y}
                                textAnchor="middle"
                                dominantBaseline="central"
                                aria-hidden="true"
                                className="pointer-events-none fill-primary-foreground text-[8px] font-semibold"
                              >
                                {seat.number}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  ))}
                </svg>
              </div>
            </TransformComponent>
          </div>
        )}
      </TransformWrapper>

      <ul aria-label="Leyenda" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.8125rem] text-muted-foreground">
        {LEGEND.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <span aria-hidden="true" className={cn("size-3.5 rounded-full", item.className)} />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

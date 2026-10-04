"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MapTooltip, useMapTooltip } from "@/modules/tickets/components/map-tooltip";
import { getZoneToneClasses } from "@/modules/tickets/components/zone-tones";
import {
  focusableSeats,
  isSeatNavigationKey,
  nextSeatId,
} from "@/modules/tickets/services/seat-navigation";
import type { Seat, VenueZone } from "@/modules/tickets/types/venue.types";

interface SeatMapProps {
  zone: VenueZone;
  selectedSeatIds: string[];
  /** Con el máximo alcanzado, los asientos libres no seleccionados quedan deshabilitados. */
  maxReached: boolean;
  onToggleSeat: (seat: Seat) => void;
  className?: string;
}

/** Butaca centrada en (0,0) mirando hacia arriba (al escenario): asiento + respaldo. */
const SEAT_BODY = "M -8 -7 h 16 a 3 3 0 0 1 3 3 v 7 a 2 2 0 0 1 -2 2 h -18 a 2 2 0 0 1 -2 -2 v -7 a 3 3 0 0 1 3 -3 z";
const SEAT_BACK = "M -9 6 h 18 a 2 2 0 0 1 0 4 h -18 a 2 2 0 0 1 0 -4 z";
const PADDING = 22;
const STAGE_HEIGHT = 16;
const STAGE_GAP = 26;

const CONTROL_CLASSES =
  "flex size-9 cursor-pointer items-center justify-center text-white transition-colors outline-none hover:bg-white/15 focus-visible:ring-3 focus-visible:ring-ring";

function LegendSeat({ className }: { className: string }) {
  return (
    <svg viewBox="-11 -9 22 20" aria-hidden="true" className="size-4">
      <path d={SEAT_BODY} className={className} />
      <path d={SEAT_BACK} className={className} />
    </svg>
  );
}

/** Mapa de asientos en modo noche: filas curvas frente al escenario, butacas con el color de la zona y zoom. */
export function SeatMap({ zone, selectedSeatIds, maxReached, onToggleSeat, className }: SeatMapProps) {
  const { containerRef, tooltip, show, hide } = useMapTooltip();
  const tone = getZoneToneClasses(zone);
  const descriptionId = useId();
  const seatRefs = useRef(new Map<string, SVGGElement>());
  const [focusedSeatId, setFocusedSeatId] = useState<string | null>(null);

  // Roving tabindex: el mapa tiene una sola parada de Tab. Si la última butaca enfocada no está en esta zona, se usa la primera libre.
  const focusable = useMemo(() => focusableSeats(zone), [zone]);
  const tabStopId = focusable.some((seat) => seat.id === focusedSeatId) ? focusedSeatId : (focusable[0]?.id ?? null);

  // El viewBox se calcula a partir de las butacas y las etiquetas de fila (filas curvas).
  const box = useMemo(() => {
    const points = zone.rows.flatMap((row) => [...row.seats, ...row.labelPositions]);
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs) - PADDING;
    const maxX = Math.max(...xs) + PADDING;
    const minY = Math.min(...ys) - PADDING - STAGE_HEIGHT - STAGE_GAP;
    const maxY = Math.max(...ys) + PADDING;
    return { minX, minY, width: maxX - minX, height: maxY - minY };
  }, [zone.rows]);

  const stageWidth = box.width * 0.5;

  const focusSeat = (seatId: string) => {
    setFocusedSeatId(seatId);
    seatRefs.current.get(seatId)?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<SVGGElement>, seat: Seat, isDisabled: boolean) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isDisabled) onToggleSeat(seat);
      return;
    }
    if (isSeatNavigationKey(event.key)) {
      event.preventDefault();
      const targetId = nextSeatId(zone, seat.id, event.key);
      if (targetId) focusSeat(targetId);
    }
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <p id={descriptionId} className="sr-only">
        Usa las flechas para moverte entre asientos disponibles, Inicio y Fin para ir al principio y al final de la fila, y Enter o Espacio para elegir.
      </p>
      <TransformWrapper
        minScale={0.5}
        maxScale={4}
        doubleClick={{ disabled: true }}
        // En móvil el mapa es más ancho que la pantalla: se arranca centrado en el escenario.
        centerOnInit
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <div
            ref={containerRef}
            onPointerLeave={hide}
            className="relative overflow-hidden rounded-2xl bg-brand-deep bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--primary)_40%,transparent),transparent_65%)]"
          >
            <div className="absolute right-3 bottom-3 z-10 flex overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur">
              <button type="button" aria-label="Alejar" onClick={() => zoomOut()} className={CONTROL_CLASSES}>
                <Minus className="size-4" aria-hidden="true" />
              </button>
              <button type="button" aria-label="Restablecer zoom" onClick={() => resetTransform()} className={CONTROL_CLASSES}>
                <RotateCcw className="size-4" aria-hidden="true" />
              </button>
              <button type="button" aria-label="Acercar" onClick={() => zoomIn()} className={CONTROL_CLASSES}>
                <Plus className="size-4" aria-hidden="true" />
              </button>
            </div>

            <TransformComponent wrapperClass="!w-full cursor-grab active:cursor-grabbing" contentClass="!min-w-full">
              <div className="flex w-full min-w-fit justify-center px-2 pt-2 pb-14 sm:px-6">
                {/* Ancho mínimo para que cada butaca sea un blanco táctil usable; en móvil se recorre arrastrando. */}
                <svg
                  viewBox={`${box.minX} ${box.minY} ${box.width} ${box.height}`}
                  role="group"
                  aria-label={`Asientos de ${zone.name}`}
                  aria-describedby={descriptionId}
                  className="h-auto w-full select-none"
                  style={{ minWidth: box.width * 1.1 }}
                >
                  <defs>
                    <filter id="seat-map-glow" x="-20%" y="-100%" width="140%" height="300%">
                      <feGaussianBlur stdDeviation="6" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <g aria-hidden="true" filter="url(#seat-map-glow)">
                    <rect
                      x={-stageWidth / 2}
                      y={box.minY + PADDING}
                      width={stageWidth}
                      height={STAGE_HEIGHT}
                      rx={STAGE_HEIGHT / 2}
                      className="fill-white"
                    />
                    <text
                      x={0}
                      y={box.minY + PADDING + STAGE_HEIGHT / 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-brand-deep text-[8px] font-bold tracking-[0.2em]"
                    >
                      ESCENARIO
                    </text>
                  </g>

                  {zone.rows.map((row) => (
                    <g key={row.label}>
                      {row.labelPositions.map((position, index) => (
                        <text
                          key={index}
                          x={position.x}
                          y={position.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          aria-hidden="true"
                          className="fill-white/55 text-[10px] font-semibold"
                        >
                          {row.label}
                        </text>
                      ))}

                      {row.seats.map((seat) => {
                        const isTaken = seat.status === "taken";
                        const isSelected = selectedSeatIds.includes(seat.id);
                        const isDisabled = isTaken || (maxReached && !isSelected);
                        const label = `Fila ${seat.row}, asiento ${seat.number}${isTaken ? ", ocupado" : ""}`;

                        return (
                          <g
                            key={seat.id}
                            ref={(element) => {
                              if (element) seatRefs.current.set(seat.id, element);
                              else seatRefs.current.delete(seat.id);
                            }}
                            role={isTaken ? "img" : "button"}
                            tabIndex={isTaken ? undefined : seat.id === tabStopId ? 0 : -1}
                            aria-label={label}
                            aria-pressed={isTaken ? undefined : isSelected}
                            aria-disabled={!isTaken && isDisabled ? true : undefined}
                            onClick={isDisabled ? undefined : () => onToggleSeat(seat)}
                            onKeyDown={isTaken ? undefined : (event) => handleKeyDown(event, seat, isDisabled)}
                            onFocus={isTaken ? undefined : () => setFocusedSeatId(seat.id)}
                            onPointerMove={
                              isTaken
                                ? undefined
                                : (event) =>
                                    show(
                                      event,
                                      <span>
                                        <strong className="font-semibold">
                                          Fila {seat.row} · Asiento {seat.number}
                                        </strong>{" "}
                                        · <span className="font-semibold text-primary">{formatPrice(zone.price)}</span>
                                      </span>
                                    )
                            }
                            onPointerLeave={hide}
                            transform={`translate(${seat.x} ${seat.y}) rotate(${seat.angle})`}
                            className={cn(
                              "group/seat outline-none",
                              isDisabled ? "cursor-not-allowed" : "cursor-pointer",
                              !isTaken && !isSelected && maxReached && "opacity-35"
                            )}
                          >
                            {isTaken ? (
                              <circle r={3} className="fill-white/20" />
                            ) : (
                              <>
                                {/* Área táctil más grande que la butaca */}
                                <rect x={-11} y={-10} width={22} height={22} className="fill-transparent" />
                                <path
                                  d={SEAT_BODY}
                                  className={cn(
                                    isSelected ? "fill-white" : tone.fill,
                                    "stroke-[1.5] transition-colors duration-150 motion-reduce:transition-none",
                                    isSelected ? "stroke-white" : "stroke-transparent",
                                    !isDisabled && !isSelected && "group-hover/seat:stroke-white",
                                    "group-focus-visible/seat:stroke-ring group-focus-visible/seat:stroke-[3]"
                                  )}
                                />
                                <path d={SEAT_BACK} className={isSelected ? "fill-white" : tone.fill} />
                                {isSelected && (
                                  <text
                                    y={0}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    aria-hidden="true"
                                    transform={`rotate(${-seat.angle})`}
                                    className="pointer-events-none fill-brand-deep text-[8px] font-bold"
                                  >
                                    {seat.number}
                                  </text>
                                )}
                              </>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  ))}
                </svg>
              </div>
            </TransformComponent>
            <MapTooltip tooltip={tooltip} />
          </div>
        )}
      </TransformWrapper>

      <ul aria-label="Leyenda" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.8125rem] text-muted-foreground">
        <li className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-brand-deep">
            <LegendSeat className={tone.fill} />
          </span>
          Disponible
        </li>
        <li className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-brand-deep">
            <LegendSeat className="fill-white" />
          </span>
          Seleccionado
        </li>
        <li className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-brand-deep">
            <span className="size-1.5 rounded-full bg-white/30" />
          </span>
          Ocupado
        </li>
      </ul>
    </div>
  );
}

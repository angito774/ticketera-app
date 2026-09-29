"use client";

import { Armchair } from "lucide-react";

import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { QuantityStepper } from "@/modules/tickets/components/quantity-stepper";
import { ZoneStatusBadge } from "@/modules/tickets/components/zone-status-badge";
import { getZoneToneClasses } from "@/modules/tickets/components/zone-tones";
import { MAX_TICKETS_PER_ZONE } from "@/modules/tickets/services/venues.service";
import type { PurchaseSelection } from "@/modules/tickets/store/purchase.store";
import type { VenueZone } from "@/modules/tickets/types/venue.types";

interface ZoneTicketListProps {
  zones: VenueZone[];
  selection: PurchaseSelection;
  activeZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
  onQuantityChange: (zone: VenueZone, quantity: number) => void;
  className?: string;
}

/** Lista "Entradas": contador para zonas generales y acceso al mapa de asientos para las numeradas. */
export function ZoneTicketList({
  zones,
  selection,
  activeZoneId,
  onSelectZone,
  onQuantityChange,
  className,
}: ZoneTicketListProps) {
  return (
    <section
      className={cn("flex flex-col rounded-3xl border bg-card px-4 py-2 lg:px-7", className)}
    >
      <h2 className="pt-4 pb-2 text-lg font-semibold lg:text-xl">Entradas</h2>
      <ul className="flex flex-col">
        {zones.map((zone) => {
          const isActive = zone.id === activeZoneId;
          const seatCount = selection.seats[zone.id]?.length ?? 0;

          return (
            <li
              key={zone.id}
              className={cn(
                "-mx-2 flex min-h-19 items-center gap-3 rounded-2xl border-t px-2 transition-colors lg:-mx-3 lg:gap-4 lg:px-3",
                isActive && "bg-accent"
              )}
            >
              <span
                aria-hidden="true"
                className={cn("size-3.5 shrink-0 rounded", getZoneToneClasses(zone).swatch)}
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2 font-semibold">
                  {zone.name}
                  <ZoneStatusBadge status={zone.status} />
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatPrice(zone.price)} c/u
                  {zone.seating === "numbered" && (
                    <span className="hidden sm:inline"> · numerada</span>
                  )}
                </span>
              </span>

              {zone.status === "sold-out" ? (
                <span className="flex h-11 items-center rounded-xl bg-muted px-4 text-sm font-semibold text-muted-foreground">
                  Agotado
                </span>
              ) : zone.seating === "general" ? (
                <QuantityStepper
                  value={selection.quantities[zone.id] ?? 0}
                  max={MAX_TICKETS_PER_ZONE}
                  itemLabel={zone.name}
                  onChange={(quantity) => onQuantityChange(zone, quantity)}
                />
              ) : (
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onSelectZone(zone.id)}
                  className={cn(
                    "flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  )}
                >
                  <Armchair className="size-4" aria-hidden="true" />
                  {seatCount > 0
                    ? `${seatCount} ${seatCount === 1 ? "asiento" : "asientos"}`
                    : (
                      <>
                        <span className="hidden sm:inline">Elegir asientos</span>
                        <span className="sm:hidden">Asientos</span>
                      </>
                    )}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="border-t pt-3.5 pb-4.5 text-[0.8125rem] text-muted-foreground">
        Máximo {MAX_TICKETS_PER_ZONE} entradas por zona.
      </p>
    </section>
  );
}

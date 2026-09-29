"use client";

import { useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { cn } from "@/lib/utils";
import { PurchaseSummary } from "@/modules/tickets/components/purchase-summary";
import { SeatMap } from "@/modules/tickets/components/seat-map";
import { VenueMap } from "@/modules/tickets/components/venue-map";
import { ZoneTicketList } from "@/modules/tickets/components/zone-ticket-list";
import { MAX_TICKETS_PER_ZONE } from "@/modules/tickets/services/venues.service";
import {
  buildPurchaseSummary,
  usePurchaseStore,
  type PurchaseSelection,
} from "@/modules/tickets/store/purchase.store";
import type { VenueLayout } from "@/modules/tickets/types/venue.types";

interface TicketSelectionProps {
  eventId: string;
  layout: VenueLayout;
  checkoutHref: string;
  className?: string;
}

const EMPTY_SELECTION: PurchaseSelection = { quantities: {}, seats: {} };

const CARD_CLASSES = "flex flex-col gap-4 rounded-3xl border bg-card p-4 lg:gap-5 lg:px-7 lg:pt-6 lg:pb-7";

/** Selección de entradas: mapa de zonas, mapa de asientos, lista de zonas y resumen, conectados al store. */
export function TicketSelection({ eventId, layout, checkoutHref, className }: TicketSelectionProps) {
  const state = usePurchaseStore(
    useShallow((store) => ({
      eventId: store.eventId,
      activeZoneId: store.activeZoneId,
      quantities: store.quantities,
      seats: store.seats,
    }))
  );
  const { startPurchase, selectZone, setQuantity, toggleSeat } = usePurchaseStore(
    useShallow((store) => ({
      startPurchase: store.startPurchase,
      selectZone: store.selectZone,
      setQuantity: store.setQuantity,
      toggleSeat: store.toggleSeat,
    }))
  );

  useEffect(() => {
    startPurchase(eventId);
  }, [eventId, startPurchase]);

  // Hasta que el efecto corre, el store puede tener la selección de otro evento: no mostrarla.
  const isCurrentEvent = state.eventId === eventId;
  const selection = isCurrentEvent ? state : EMPTY_SELECTION;
  const activeZoneId = isCurrentEvent ? state.activeZoneId : null;

  const summary = useMemo(() => buildPurchaseSummary(layout, selection), [layout, selection]);
  const activeZone = layout.zones.find((zone) => zone.id === activeZoneId);
  const activeSeatIds = activeZone ? (selection.seats[activeZone.id] ?? []) : [];

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-8",
        className
      )}
    >
      <div className="flex flex-col gap-4 lg:gap-6">
        <section className={CARD_CLASSES}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold lg:text-xl">Elige tu zona</h2>
            <span className="text-[0.8125rem] text-muted-foreground">Toca una zona del mapa</span>
          </div>
          <div className="rounded-2xl bg-muted/60 p-3 lg:p-5">
            <VenueMap
              layout={layout}
              activeZoneId={activeZoneId}
              onSelectZone={selectZone}
              className="mx-auto max-w-2xl"
            />
          </div>
        </section>

        {activeZone?.seating === "numbered" && (
          <section aria-live="polite" className={CARD_CLASSES}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold lg:text-xl">
                Elige tus asientos · {activeZone.name}
              </h2>
              <span className="text-[0.8125rem] text-muted-foreground">
                {activeSeatIds.length} de {MAX_TICKETS_PER_ZONE} seleccionados
              </span>
            </div>
            <SeatMap
              key={activeZone.id}
              zone={activeZone}
              selectedSeatIds={activeSeatIds}
              maxReached={activeSeatIds.length >= MAX_TICKETS_PER_ZONE}
              onToggleSeat={(seat) => toggleSeat(activeZone, seat)}
            />
          </section>
        )}

        <ZoneTicketList
          zones={layout.zones}
          selection={selection}
          activeZoneId={activeZoneId}
          onSelectZone={selectZone}
          onQuantityChange={setQuantity}
        />
      </div>

      <PurchaseSummary summary={summary} checkoutHref={checkoutHref} />
    </div>
  );
}

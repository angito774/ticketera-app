"use client";

import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import { PurchaseSummary } from "@/modules/tickets/components/purchase-summary";
import { SeatMap } from "@/modules/tickets/components/seat-map";
import { SelectedSeatChips } from "@/modules/tickets/components/selected-seat-chips";
import { VenueMap } from "@/modules/tickets/components/venue-map";
import { ZoneLegend } from "@/modules/tickets/components/zone-legend";
import { ZoneTicketList } from "@/modules/tickets/components/zone-ticket-list";
import { MAX_TICKETS_PER_ZONE } from "@/modules/tickets/services/venues.service";
import {
  buildPurchaseSummary,
  usePurchaseStore,
  type PurchaseSelection,
} from "@/modules/tickets/store/purchase.store";
import {
  applyAvailability,
  findUnavailableSelection,
  getZoneMaxTickets,
  type EventAvailability,
} from "@/modules/tickets/services/availability-overlay";
import type { VenueLayout, VenueZone } from "@/modules/tickets/types/venue.types";

interface TicketSelectionProps {
  eventId: string;
  layout: VenueLayout;
  availability?: EventAvailability | null;
  checkoutHref: string;
  className?: string;
}

const EMPTY_SELECTION: PurchaseSelection = { quantities: {}, seats: {} };

const CARD_CLASSES = "flex flex-col gap-4 rounded-3xl border bg-card p-4 lg:gap-5 lg:px-7 lg:pt-6 lg:pb-7";

/** Selección de entradas: mapa de zonas, mapa de asientos, lista de zonas y resumen, conectados al store. */
export function TicketSelection({
  eventId,
  layout: baseLayout,
  availability,
  checkoutHref,
  className,
}: TicketSelectionProps) {
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

  // La selección vive en sessionStorage (el servidor no la conoce): se muestra recién
  // tras hidratar, y nunca si pertenece a otro evento (antes de que corra el efecto).
  const hydrated = useHydrated();
  const isCurrentEvent = hydrated && state.eventId === eventId;
  const selection = isCurrentEvent ? state : EMPTY_SELECTION;
  const activeZoneId = isCurrentEvent ? state.activeZoneId : null;

  const [highlightedZoneId, setHighlightedZoneId] = useState<string | null>(null);
  const [removedNotice, setRemovedNotice] = useState(false);

  const layout = useMemo(
    () => (availability ? applyAvailability(baseLayout, availability) : baseLayout),
    [baseLayout, availability]
  );

  const hasUnavailable =
    !!availability &&
    isCurrentEvent &&
    (() => {
      const found = findUnavailableSelection(selection, availability);
      return Object.keys(found.seats).length > 0 || found.zones.length > 0;
    })();
  if (hasUnavailable && !removedNotice) setRemovedNotice(true);

  useEffect(() => {
    if (!availability || !isCurrentEvent) return;
    const current = usePurchaseStore.getState();
    const { seats, zones } = findUnavailableSelection(current, availability);
    if (!Object.keys(seats).length && !zones.length) return;

    usePurchaseStore.setState({
      seats: Object.fromEntries(
        Object.entries(current.seats).map(([zoneId, ids]) => [
          zoneId,
          ids.filter((id) => !seats[zoneId]?.includes(id)),
        ])
      ),
      quantities: Object.fromEntries(
        Object.entries(current.quantities).map(([zoneId, quantity]) => [
          zoneId,
          zones.includes(zoneId) ? getZoneMaxTickets(availability, zoneId) : quantity,
        ])
      ),
    });
  }, [availability, isCurrentEvent]);

  const handleQuantityChange = (zone: VenueZone, quantity: number) =>
    setQuantity(zone, Math.min(quantity, getZoneMaxTickets(availability ?? null, zone.id)));

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
        {removedNotice && (
          <p role="status" className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium">
            Algunas entradas que elegiste ya no están disponibles y se quitaron de tu selección
          </p>
        )}
        <section className={CARD_CLASSES}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold lg:text-xl">Elige tu zona</h2>
            <span className="text-[0.8125rem] text-muted-foreground">Toca una zona del mapa</span>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl bg-brand-deep bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--primary)_40%,transparent),transparent_65%)] p-3 lg:gap-5 lg:p-6">
            <ZoneLegend
              zones={layout.zones}
              activeZoneId={activeZoneId}
              onSelectZone={selectZone}
              onHighlightZone={setHighlightedZoneId}
            />
            <VenueMap
              layout={layout}
              activeZoneId={activeZoneId}
              highlightedZoneId={highlightedZoneId}
              onSelectZone={selectZone}
              className="mx-auto w-full max-w-2xl"
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
            <SelectedSeatChips
              zone={activeZone}
              selectedSeatIds={activeSeatIds}
              onRemove={(seat) => toggleSeat(activeZone, seat)}
            />
          </section>
        )}

        <ZoneTicketList
          zones={layout.zones}
          selection={selection}
          activeZoneId={activeZoneId}
          onSelectZone={selectZone}
          onQuantityChange={handleQuantityChange}
        />
      </div>

      <PurchaseSummary summary={summary} checkoutHref={checkoutHref} />
    </div>
  );
}

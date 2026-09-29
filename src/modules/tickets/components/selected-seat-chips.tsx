import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Seat, VenueZone } from "@/modules/tickets/types/venue.types";

interface SelectedSeatChipsProps {
  zone: VenueZone;
  selectedSeatIds: string[];
  onRemove: (seat: Seat) => void;
  className?: string;
}

/** Un chip por asiento elegido, para quitarlo sin buscarlo en el mapa. */
export function SelectedSeatChips({ zone, selectedSeatIds, onRemove, className }: SelectedSeatChipsProps) {
  const seats = zone.rows.flatMap((row) => row.seats).filter((seat) => selectedSeatIds.includes(seat.id));
  if (seats.length === 0) return null;

  return (
    <ul aria-label="Asientos elegidos" className={cn("flex flex-wrap gap-2", className)}>
      {seats.map((seat) => (
        <li key={seat.id}>
          <button
            type="button"
            aria-label={`Quitar Fila ${seat.row}, asiento ${seat.number}`}
            onClick={() => onRemove(seat)}
            className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-accent pr-2.5 pl-3 text-[0.8125rem] font-semibold text-accent-foreground transition-colors outline-none hover:bg-primary/15 focus-visible:ring-3 focus-visible:ring-ring"
          >
            Fila {seat.row} · {seat.number}
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

import type { ComponentType } from "react";
import { Clock, DoorOpen, Map as MapIcon, QrCode, UserCheck } from "lucide-react";

import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EventDetail } from "@/modules/events/types/event.types";

interface EventInfoProps {
  event: EventDetail;
  className?: string;
}

interface InfoItem {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
}

function getInfoItems(event: EventDetail): InfoItem[] {
  return [
    { label: "Apertura de puertas", value: `${formatTime(event.doorsOpenAt)} h`, icon: DoorOpen },
    { label: "Inicio del show", value: `${formatTime(event.date)} h`, icon: Clock },
    {
      label: "Edad mínima",
      value: event.minAge === null ? "Todo público" : `${event.minAge} años`,
      icon: UserCheck,
    },
    { label: "Ingreso", value: "Entrada digital con QR", icon: QrCode },
  ];
}

const SECTION_TITLE_CLASSES = "text-xl font-bold tracking-tight lg:text-2xl";

/** "Acerca del evento", "Información importante" y "Lugar". */
export function EventInfo({ event, className }: EventInfoProps) {
  const directionsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${event.venue}, ${event.address}`
  )}`;

  return (
    <div className={cn("flex flex-col gap-10 lg:gap-12", className)}>
      <section className="flex flex-col gap-4">
        <h2 className={SECTION_TITLE_CLASSES}>Acerca del evento</h2>
        <p className="leading-relaxed text-muted-foreground">
          {event.description}
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className={SECTION_TITLE_CLASSES}>Información importante</h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4">
          {getInfoItems(event).map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-3.5 rounded-2xl border px-5 py-4"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-0.5">
                <dt className="text-[0.8125rem] text-muted-foreground">
                  {label}
                </dt>
                <dd className="font-semibold">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className={SECTION_TITLE_CLASSES}>Lugar</h2>
        <div className="overflow-hidden rounded-3xl border">
          <div
            aria-hidden="true"
            className="flex h-40 flex-col items-center justify-center gap-2.5 bg-accent text-accent-foreground lg:h-60"
          >
            <MapIcon className="size-8" />
            <span className="text-sm font-semibold">{event.venue}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 lg:px-6">
            <div className="flex flex-col gap-0.5">
              <span className="text-[1.0625rem] font-semibold">
                {event.venue}
              </span>
              <span className="text-sm text-muted-foreground">
                {event.address}, {event.city}
              </span>
            </div>
            <a
              href={directionsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 cursor-pointer items-center rounded-xl border-[1.5px] border-foreground px-4 text-sm font-semibold transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring"
            >
              Cómo llegar
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

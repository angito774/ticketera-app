import type { TierFormValues } from "@/modules/organizer/schemas/event-form.schema";

const LIMA_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Lima",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Fecha (YYYY-MM-DD) y hora (HH:mm) de un instante en America/Lima, sin depender de la zona del servidor. */
export function toLimaDateTimeParts(date: Date): { date: string; time: string } {
  const parts = Object.fromEntries(
    LIMA_FORMAT.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

/** Centavos enteros a soles como string sin ceros sobrantes: 15000 -> "150", 15050 -> "150.5", 15005 -> "150.05". */
export function centavosToPriceString(cents: number): string {
  const rounded = Math.round(cents);
  const whole = Math.trunc(rounded / 100);
  const fraction = String(Math.abs(rounded % 100)).padStart(2, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : String(whole);
}

export interface ZoneRef {
  id: string;
}

export interface TicketTypeRef {
  venueZoneId: string;
  price: number;
  quantityTotal: number | null;
}

/** Un tier por zona, en el orden de las zonas: habilitado con datos si existe el tipo de entrada, vacío si no. */
export function buildTierValues(zones: ZoneRef[], types: TicketTypeRef[]): TierFormValues[] {
  const byZone = new Map(types.map((t) => [t.venueZoneId, t]));
  return zones.map((zone) => {
    const type = byZone.get(zone.id);
    return type
      ? {
          zoneId: zone.id,
          enabled: true,
          price: centavosToPriceString(type.price),
          quantity: type.quantityTotal === null ? "" : String(type.quantityTotal),
        }
      : { zoneId: zone.id, enabled: false, price: "", quantity: "" };
  });
}

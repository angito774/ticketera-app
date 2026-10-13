import type { VenueZone, ZoneTone } from "@/modules/tickets/types/venue.types";

interface ZoneToneClasses {
  /** Relleno SVG de la zona o de la butaca en los mapas (fondo oscuro). */
  fill: string;
  /** Color del texto SVG sobre la zona. */
  textFill: string;
  /** Muestra de color en listas y leyendas (fondo claro u oscuro). */
  swatch: string;
}

const TONE_CLASSES: Record<ZoneTone, ZoneToneClasses> = {
  1: { fill: "fill-zone-1", textFill: "fill-zone-foreground-strong", swatch: "bg-zone-1" },
  2: { fill: "fill-zone-2", textFill: "fill-zone-foreground-strong", swatch: "bg-zone-2" },
  3: { fill: "fill-zone-3", textFill: "fill-zone-foreground-soft", swatch: "bg-zone-3" },
  4: { fill: "fill-zone-4", textFill: "fill-zone-foreground-soft", swatch: "bg-zone-4" },
  5: { fill: "fill-zone-5", textFill: "fill-zone-foreground-soft", swatch: "bg-zone-5" },
};

/** Agotada: sin color de precio y con rayado (el patrón lo dibuja `VenueMap`). */
const SOLD_OUT_CLASSES: ZoneToneClasses = {
  fill: "fill-white/10",
  textFill: "fill-white/95",
  swatch: "bg-border",
};

export function getZoneToneClasses(zone: VenueZone): ZoneToneClasses {
  return zone.status === "sold-out" ? SOLD_OUT_CLASSES : TONE_CLASSES[zone.tone];
}

// Los eventos se guardan como ISO 8601 con offset de Lima; se formatean siempre en
// esa zona horaria para que el servidor (UTC) y el navegador muestren la misma fecha.
const LOCALE = "es-PE";
const TIME_ZONE = "America/Lima";

const priceFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const longDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: TIME_ZONE,
});

const shortDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: TIME_ZONE,
});

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: TIME_ZONE,
});

const monthFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: "short",
  timeZone: TIME_ZONE,
});

const dayFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  timeZone: TIME_ZONE,
});

/** "S/ 350", "S/ 1,450", "S/ 99.5" */
export function formatPrice(amount: number): string {
  return priceFormatter.format(amount);
}

/** "14 de noviembre de 2026" */
export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

/** "sábado, 14 de noviembre" */
export function formatLongDate(iso: string): string {
  return longDateFormatter.format(new Date(iso));
}

/** "sáb, 14 nov." */
export function formatShortDate(iso: string): string {
  return shortDateFormatter.format(new Date(iso));
}

/** "20:00" */
export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

/** Partes para la etiqueta de calendario de las tarjetas: { month: "NOV", day: "14" } */
export function formatDateBadge(iso: string): { month: string; day: string } {
  const date = new Date(iso);
  return {
    month: monthFormatter.format(date).replace(".", "").toUpperCase(),
    day: dayFormatter.format(date),
  };
}

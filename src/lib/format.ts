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

const decimalComma = (value: number, fractionDigits: number): string =>
  value.toFixed(fractionDigits).replace(".", ",");

const trimTrailingZero = (text: string): string => text.replace(/,0$/, "");

/** Monto en céntimos para ejes de gráficos: "S/ 850", "S/ 12 mil", "S/ 1,5 M" */
export function formatCompactPrice(cents: number): string {
  const soles = Math.abs(cents) / 100;
  const sign = cents < 0 ? "-" : "";
  if (soles < 1000) return `${sign}S/ ${Math.round(soles)}`;
  const thousands = Math.round((soles / 1000) * 10) / 10;
  if (thousands < 1000) {
    return `${sign}S/ ${trimTrailingZero(decimalComma(thousands, 1))} mil`;
  }
  const millions = Math.round((soles / 1_000_000) * 10) / 10;
  return `${sign}S/ ${trimTrailingZero(decimalComma(millions, 1))} M`;
}

/** 0.734 -> "73 %" */
export function formatPercent(ratio: number, fractionDigits = 0): string {
  return `${decimalComma(ratio * 100, fractionDigits)} %`;
}

/** "+12,3 %", "-4,0 %", "0,0 %" o "—" cuando no hay base de comparación */
export function formatDeltaPct(deltaPct: number | null): string {
  if (deltaPct === null || !Number.isFinite(deltaPct)) return "—";
  const text = decimalComma(Math.abs(deltaPct), 1);
  if (Number(text.replace(",", ".")) === 0) return `${text} %`;
  return `${deltaPct > 0 ? "+" : "-"}${text} %`;
}

const LIMA_TIME_ZONE = "America/Lima";
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const limaDateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: LIMA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha de calendario "YYYY-MM-DD" del instante dado en America/Lima. */
export function toLimaDate(now: Date): string {
  const parts = limaDateFormat.formatToParts(now);
  const get = (type: "year" | "month" | "day") => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Suma días hábiles (sin sábado ni domingo, sin feriados) a una fecha "YYYY-MM-DD".
 * La fecha de inicio no cuenta. Opera en UTC puro: no depende de la zona del proceso.
 */
export function addBusinessDays(isoDate: string, days: number): string {
  const match = ISO_DATE.exec(isoDate);
  if (!match) throw new Error(`Invalid ISO date: ${isoDate}`);
  if (!Number.isInteger(days) || days < 0) throw new Error(`Invalid business days: ${days}`);

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  let remaining = days;
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    const weekday = date.getUTCDay();
    if (weekday !== 0 && weekday !== 6) remaining -= 1;
  }
  return date.toISOString().slice(0, 10);
}

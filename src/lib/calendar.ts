interface CalendarEventInput {
  id: string;
  title: string;
  /** ISO 8601 con offset. */
  start: string;
  durationMinutes?: number;
  location: string;
  description?: string;
}

/** "20261115T010000Z" */
function toUtcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escapa texto según RFC 5545 (\\, ;, , y saltos de línea). */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Contenido de un archivo .ics (iCalendar) con un único evento. */
export function buildCalendarFile(
  { id, title, start, durationMinutes = 180, location, description }: CalendarEventInput,
  now: Date = new Date()
): string {
  const startDate = new Date(start);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60_000);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ticketera//Entradas//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${id}@ticketera`,
    `DTSTAMP:${toUtcStamp(now)}`,
    `DTSTART:${toUtcStamp(startDate)}`,
    `DTEND:${toUtcStamp(endDate)}`,
    `SUMMARY:${escapeText(title)}`,
    `LOCATION:${escapeText(location)}`,
    ...(description ? [`DESCRIPTION:${escapeText(description)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

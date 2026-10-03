const DAY_MS = 86_400_000;

// UTC calendar days so server and browser (different time zones) render the same text.
function startOfDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function plural(n: number, singular: string, pluralForm: string): string {
  return `Hace ${n} ${n === 1 ? singular : pluralForm}`;
}

export function formatRelativeTime(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "Nunca";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Nunca";

  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) return plural(Math.floor(days / 7), "semana", "semanas");
  return plural(Math.floor(days / 30), "mes", "meses");
}

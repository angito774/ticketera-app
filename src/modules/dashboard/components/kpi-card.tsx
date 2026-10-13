import { Card, CardContent } from "@/components/ui/card";
import { formatDeltaPct } from "@/lib/format";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  /** null = sin base de comparación; undefined = el KPI no tiene delta. */
  deltaPct?: number | null;
  hint?: string;
}

function DeltaBadge({ deltaPct }: { deltaPct: number | null }) {
  if (deltaPct === null || !Number.isFinite(deltaPct)) {
    return (
      <span className="text-muted-foreground tabular-nums">
        <span aria-hidden="true">—</span>
        <span className="sr-only">sin datos del periodo anterior</span>
      </span>
    );
  }

  const direction = deltaPct > 0 ? "up" : deltaPct < 0 ? "down" : "flat";
  const text = formatDeltaPct(deltaPct);

  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        direction === "up" && "text-emerald-700 dark:text-emerald-400",
        direction === "down" && "text-destructive",
        direction === "flat" && "text-muted-foreground"
      )}
    >
      <span aria-hidden="true">
        {direction === "up" ? "▲ " : direction === "down" ? "▼ " : ""}
      </span>
      {text}
      <span className="sr-only">
        {direction === "up"
          ? " más que el periodo anterior"
          : direction === "down"
            ? " menos que el periodo anterior"
            : " igual que el periodo anterior"}
      </span>
    </span>
  );
}

export function KpiCard({ label, value, deltaPct, hint }: KpiCardProps) {
  return (
    <Card size="sm">
      <CardContent className="grid gap-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-2xl font-semibold tabular-nums">{value}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-xs">
          {deltaPct !== undefined && <DeltaBadge deltaPct={deltaPct} />}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </p>
      </CardContent>
    </Card>
  );
}

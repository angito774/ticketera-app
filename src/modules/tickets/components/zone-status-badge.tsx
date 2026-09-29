import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ZoneStatus } from "@/modules/tickets/types/venue.types";

interface ZoneStatusBadgeProps {
  status: ZoneStatus;
  className?: string;
}

/** Badge "Últimas" para zonas con pocas entradas; no renderiza nada en otros estados. */
export function ZoneStatusBadge({ status, className }: ZoneStatusBadgeProps) {
  if (status !== "last-tickets") return null;

  return (
    <Badge
      className={cn(
        "h-6 bg-warning px-2 font-semibold text-warning-foreground",
        className
      )}
    >
      Últimas
    </Badge>
  );
}

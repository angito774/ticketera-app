import { AlertTriangle, CircleHelp, Clock, OctagonAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { REFUND_MAX_BUSINESS_DAYS, type RefundDeadline } from "@/lib/refund-policy";

interface RefundDeadlineBadgeProps {
  deadline: RefundDeadline;
}

export function RefundDeadlineBadge({ deadline }: RefundDeadlineBadgeProps) {
  const { state, businessDays } = deadline;
  const progress = `${businessDays} de ${REFUND_MAX_BUSINESS_DAYS} días hábiles`;

  if (state === "unknown" || businessDays === null) {
    return (
      <Badge variant="outline">
        <CircleHelp aria-hidden="true" />
        Sin fecha de cancelación
      </Badge>
    );
  }
  if (state === "overdue") {
    return (
      <Badge variant="destructive">
        <OctagonAlert aria-hidden="true" />
        Plazo vencido: {progress}
      </Badge>
    );
  }
  if (state === "warning") {
    return (
      <Badge variant="secondary">
        <AlertTriangle aria-hidden="true" />
        Por vencer: {progress}
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      <Clock aria-hidden="true" />
      {progress}
    </Badge>
  );
}

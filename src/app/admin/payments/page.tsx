import type { Metadata } from "next";

import { requirePermission } from "@/modules/auth/services/current-user.service";
import { SettlementsTable } from "@/modules/payments/components/settlements-table";
import { countPendingRefunds, listCancelledEventsWithPaidOrders } from "@/modules/payments/services/refund.service";
import { listSettlementCandidates, listSettlements } from "@/modules/payments/services/settlement.service";

export const metadata: Metadata = {
  title: "Pagos · Ticketera",
};

export default async function AdminPaymentsPage() {
  const user = await requirePermission("organizations:manage");
  const [candidates, settlementRows, cancelledEvents, pendingRefunds] = await Promise.all([
    listSettlementCandidates(),
    listSettlements(user),
    listCancelledEventsWithPaidOrders(user),
    countPendingRefunds(user),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Pagos</h1>
        <p className="text-sm text-muted-foreground">
          Liquida a los organizadores los eventos ya realizados y reembolsa órdenes o eventos cancelados.
        </p>
      </header>

      <SettlementsTable
        candidates={candidates}
        settlements={settlementRows}
        cancelledEvents={cancelledEvents}
        pendingRefunds={pendingRefunds}
      />
    </div>
  );
}

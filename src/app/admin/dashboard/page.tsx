import type { Metadata } from "next";
import { Suspense } from "react";

import {
  requirePermission,
  type CurrentUser,
} from "@/modules/auth/services/current-user.service";
import { DashboardContent } from "@/modules/dashboard/components/dashboard-content";
import { DashboardFiltersProvider } from "@/modules/dashboard/components/dashboard-filters-provider";
import { DashboardSkeleton } from "@/modules/dashboard/components/dashboard-skeleton";
import { PeriodSelector } from "@/modules/dashboard/components/period-selector";
import { dashboardFiltersSchema } from "@/modules/dashboard/schemas/dashboard-filters.schema";
import { getDashboardOverview } from "@/modules/dashboard/services/dashboard.service";
import type { DashboardFilters } from "@/modules/dashboard/types/dashboard.types";

export const metadata: Metadata = {
  title: "Panel · Ticketera",
};

async function DashboardData({
  user,
  filters,
}: {
  user: CurrentUser;
  filters: DashboardFilters;
}) {
  const overview = await getDashboardOverview(user, filters);
  return <DashboardContent overview={overview} />;
}

export default async function AdminDashboardPage({
  searchParams,
}: PageProps<"/admin/dashboard">) {
  const user = await requirePermission("members:manage");
  const filters = dashboardFiltersSchema.parse(await searchParams);

  return (
    <DashboardFiltersProvider filters={filters}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Panel</h1>
            <p className="text-sm text-muted-foreground">
              Ventas y ocupación de tus organizaciones.
            </p>
          </div>
          <PeriodSelector />
        </header>

        <Suspense
          key={`${filters.period}|${filters.category ?? ""}|${filters.city ?? ""}`}
          fallback={<DashboardSkeleton />}
        >
          <DashboardData user={user} filters={filters} />
        </Suspense>
      </div>
    </DashboardFiltersProvider>
  );
}

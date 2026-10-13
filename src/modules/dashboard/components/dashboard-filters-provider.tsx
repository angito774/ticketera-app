"use client";

import { createContext, useContext, type ReactNode } from "react";

import { useDashboardFilters } from "../hooks/use-dashboard-filters";
import type { DashboardFilters } from "../types/dashboard.types";

type DashboardFiltersState = ReturnType<typeof useDashboardFilters>;

const DashboardFiltersContext = createContext<DashboardFiltersState | null>(null);

interface DashboardFiltersProviderProps {
  filters: DashboardFilters;
  children: ReactNode;
}

export function DashboardFiltersProvider({ filters, children }: DashboardFiltersProviderProps) {
  const state = useDashboardFilters(filters);
  return <DashboardFiltersContext value={state}>{children}</DashboardFiltersContext>;
}

export function useDashboardFiltersContext() {
  const state = useContext(DashboardFiltersContext);
  if (!state) throw new Error("useDashboardFiltersContext requires DashboardFiltersProvider");
  return state;
}

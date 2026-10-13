"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPercent, formatPrice } from "@/lib/format";

import {
  sortTopEvents,
  type SortDirection,
  type TopEventSortKey,
} from "../services/top-events.mapping";
import type { TopEventRow } from "../types/dashboard.types";

interface TopEventsTableProps {
  rows: TopEventRow[];
  cityOptions: string[];
  city: string | undefined;
  onCityChange: (city: string | undefined) => void;
}

const ALL_CITIES = "all";

const COLUMNS: { key: TopEventSortKey; label: string }[] = [
  { key: "tickets", label: "Entradas" },
  { key: "occupancy", label: "Ocupación" },
  { key: "revenueCents", label: "Ingresos" },
];

const ARIA_SORT = { asc: "ascending", desc: "descending" } as const;

function OccupancyCell({ value }: { value: number | null }) {
  if (value === null) return <span className="block text-right">—</span>;
  const percent = Math.min(Math.max(value, 0), 1) * 100;
  return (
    <div className="flex items-center justify-end gap-2">
      <div
        className="h-2 w-20 overflow-hidden rounded-full bg-muted"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-chart-1"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="w-10 text-right tabular-nums">
        {formatPercent(value)}
      </span>
    </div>
  );
}

export function TopEventsTable({
  rows,
  cityOptions,
  city,
  onCityChange,
}: TopEventsTableProps) {
  const [sort, setSort] = useState<{
    key: TopEventSortKey;
    dir: SortDirection;
  }>({
    key: "tickets",
    dir: "desc",
  });

  const sorted = useMemo(
    () => sortTopEvents(rows, sort.key, sort.dir),
    [rows, sort],
  );

  const cityItems = useMemo(
    () => [
      { value: ALL_CITIES, label: "Todas las ciudades" },
      ...cityOptions.map((option) => ({ value: option, label: option })),
    ],
    [cityOptions],
  );

  function toggleSort(key: TopEventSortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "desc" ? "asc" : "desc" }
        : { key, dir: "desc" },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Eventos con más ventas</CardTitle>
        <CardAction className="flex items-center gap-2">
          <label
            htmlFor="top-events-city"
            className="text-sm text-muted-foreground"
          >
            Ciudad
          </label>
          <Select
            value={city ?? ALL_CITIES}
            items={cityItems}
            onValueChange={(value) =>
              onCityChange(!value || value === ALL_CITIES ? undefined : value)
            }
          >
            <SelectTrigger
              id="top-events-city"
              className="h-11 min-w-44 md:h-9"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {cityItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {sorted.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sin eventos para este filtro.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Evento</TableHead>
                {COLUMNS.map(({ key, label }) => {
                  const active = sort.key === key;
                  const Icon = !active
                    ? ArrowUpDown
                    : sort.dir === "asc"
                      ? ArrowUp
                      : ArrowDown;
                  return (
                    <TableHead
                      key={key}
                      scope="col"
                      aria-sort={active ? ARIA_SORT[sort.dir] : "none"}
                      className="text-right"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(key)}
                        className="inline-flex h-11 items-center gap-1 rounded-md px-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8"
                      >
                        {label}
                        <Icon className="size-3.5" aria-hidden="true" />
                      </button>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row) => (
                <TableRow key={row.eventId}>
                  <TableCell>
                    <div className="font-medium">{row.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.categoryLabel} · {row.city}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.tickets}
                  </TableCell>
                  <TableCell>
                    <OccupancyCell value={row.occupancy} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPrice(row.revenueCents / 100)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

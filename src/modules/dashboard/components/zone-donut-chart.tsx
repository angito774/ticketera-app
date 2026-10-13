"use client";

import { useMemo } from "react";
import { Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatPercent } from "@/lib/format";
import type { ZoneSlice } from "../types/dashboard.types";
import { ChartDataTable } from "./chart-data-table";

interface ZoneDonutChartProps {
  data: ZoneSlice[];
}

const SLICE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const formatCount = (value: number) => value.toLocaleString("es-PE");

export function ZoneDonutChart({ data }: ZoneDonutChartProps) {
  const total = data.reduce((sum, slice) => sum + slice.tickets, 0);

  const slices = useMemo(
    () =>
      data.map((slice, index) => ({
        ...slice,
        fill: SLICE_COLORS[index % SLICE_COLORS.length],
        share: total > 0 ? slice.tickets / total : 0,
      })),
    [data, total]
  );

  const config = useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        slices.map((slice) => [
          slice.name,
          { label: slice.name, color: slice.fill },
        ])
      ),
    [slices]
  );

  const top = slices[0];
  const ariaLabel = top
    ? `Gráfico de dona: entradas por zona, ${formatCount(total)} en total. Mayor zona: ${top.name} con ${formatPercent(top.share, 1)}.`
    : "Gráfico de dona: entradas por zona, sin datos.";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entradas por zona</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <ChartContainer
            config={config}
            role="img"
            aria-label={ariaLabel}
            className="mx-auto aspect-square h-52 w-full max-w-52"
          >
            <PieChart accessibilityLayer>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, name, item) => (
                      <>
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                          style={{ backgroundColor: item.payload?.fill }}
                        />
                        <span className="flex-1 text-muted-foreground">
                          {name}
                        </span>
                        <span className="font-medium text-foreground tabular-nums">
                          {formatCount(Number(value))} (
                          {formatPercent(item.payload?.share ?? 0, 1)})
                        </span>
                      </>
                    )}
                  />
                }
              />
              <Pie
                data={slices}
                dataKey="tickets"
                nameKey="name"
                innerRadius="58%"
                outerRadius="90%"
                paddingAngle={slices.length > 1 ? 2 : 0}
                strokeWidth={0}
                isAnimationActive={false}
              />
            </PieChart>
          </ChartContainer>
          <ul className="grid gap-2 text-sm">
            {slices.map((slice) => (
              <li key={slice.name} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: slice.fill }}
                />
                <span className="min-w-0 flex-1 truncate">{slice.name}</span>
                <span className="text-muted-foreground tabular-nums">
                  {formatCount(slice.tickets)} ·{" "}
                  {formatPercent(slice.share, 1)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <ChartDataTable
          caption="Entradas vendidas por zona"
          columns={[
            { id: "zone", header: "Zona" },
            { id: "tickets", header: "Entradas", numeric: true },
            { id: "share", header: "Porcentaje", numeric: true },
          ]}
          rows={slices.map((slice) => ({
            id: slice.name,
            cells: {
              zone: slice.name,
              tickets: formatCount(slice.tickets),
              share: formatPercent(slice.share, 1),
            },
          }))}
        />
      </CardContent>
    </Card>
  );
}

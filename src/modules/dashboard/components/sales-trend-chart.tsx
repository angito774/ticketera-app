"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, XAxis, YAxis } from "recharts";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatCompactPrice, formatPrice } from "@/lib/format";
import type { DailyPoint } from "../types/dashboard.types";
import { ChartDataTable } from "./chart-data-table";

type Metric = "revenue" | "tickets";

interface SalesTrendChartProps {
  data: DailyPoint[];
  periodDays: number;
}

const dayFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const fullDayFormatter = new Intl.DateTimeFormat("es-PE", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

// "YYYY-MM-DD" es una fecha de calendario Lima: se formatea en UTC para no desplazarla.
const toDate = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`);
const formatDay = (isoDate: string) =>
  dayFormatter.format(toDate(isoDate)).replace(".", "");
const formatFullDay = (isoDate: string) =>
  fullDayFormatter.format(toDate(isoDate)).replace(".", "");

const METRICS: Record<
  Metric,
  {
    title: string;
    current: (point: DailyPoint) => number;
    previous: (point: DailyPoint) => number;
    axis: (value: number) => string;
    value: (value: number) => string;
  }
> = {
  revenue: {
    title: "Ingresos",
    current: (point) => point.revenueCents,
    previous: (point) => point.prevRevenueCents,
    axis: formatCompactPrice,
    value: (value) => formatPrice(value / 100),
  },
  tickets: {
    title: "Entradas",
    current: (point) => point.tickets,
    previous: (point) => point.prevTickets,
    axis: (value) => value.toLocaleString("es-PE"),
    value: (value) => value.toLocaleString("es-PE"),
  },
};

const chartConfig = {
  current: { label: "Periodo actual", color: "var(--chart-1)" },
  previous: { label: "Periodo anterior", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

export function SalesTrendChart({ data, periodDays }: SalesTrendChartProps) {
  const [metric, setMetric] = useState<Metric>("revenue");
  const config = METRICS[metric];

  const series = useMemo(
    () =>
      data.map((point) => ({
        date: point.date,
        current: config.current(point),
        previous: config.previous(point),
      })),
    [data, config]
  );

  const total = series.reduce((sum, point) => sum + point.current, 0);
  const ariaLabel = `Gráfico de área: ${config.title.toLowerCase()} de los últimos ${periodDays} días, total ${config.value(total)}, comparado con el periodo anterior.`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ventas en el tiempo</CardTitle>
        <CardAction>
          <ToggleGroup
            variant="outline"
            spacing={0}
            value={[metric]}
            onValueChange={(next) => {
              const value = next[0];
              if (value === "revenue" || value === "tickets") setMetric(value);
            }}
            aria-label="Métrica del gráfico"
          >
            <ToggleGroupItem value="revenue">Ingresos</ToggleGroupItem>
            <ToggleGroupItem value="tickets">Entradas</ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          role="img"
          aria-label={ariaLabel}
          className="aspect-auto h-64 w-full"
        >
          <AreaChart
            data={series}
            accessibilityLayer
            margin={{ left: 4, right: 8, top: 8 }}
          >
            <defs>
              <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-current)"
                  stopOpacity={0.35}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-current)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              interval="preserveStartEnd"
              tickFormatter={formatDay}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={68}
              allowDecimals={false}
              tickFormatter={config.axis}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(_, payload) => {
                    const date = payload?.[0]?.payload?.date;
                    return typeof date === "string" ? formatFullDay(date) : "";
                  }}
                  formatter={(value, name, item) => (
                    <>
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="flex-1 text-muted-foreground">
                        {chartConfig[name as keyof typeof chartConfig]?.label ??
                          name}
                      </span>
                      <span className="font-medium text-foreground tabular-nums">
                        {config.value(Number(value))}
                      </span>
                    </>
                  )}
                />
              }
            />
            <Line
              dataKey="previous"
              name="previous"
              type="monotone"
              stroke="var(--color-previous)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            <Area
              dataKey="current"
              name="current"
              type="monotone"
              stroke="var(--color-current)"
              strokeWidth={2}
              fill="url(#trend-fill)"
              dot={false}
              isAnimationActive={false}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
        <ChartDataTable
          caption={`${config.title} por día, periodo actual y anterior`}
          columns={[
            { id: "date", header: "Día" },
            { id: "current", header: "Periodo actual", numeric: true },
            { id: "previous", header: "Periodo anterior", numeric: true },
          ]}
          rows={series.map((point) => ({
            id: point.date,
            cells: {
              date: formatFullDay(point.date),
              current: config.value(point.current),
              previous: config.value(point.previous),
            },
          }))}
        />
      </CardContent>
    </Card>
  );
}

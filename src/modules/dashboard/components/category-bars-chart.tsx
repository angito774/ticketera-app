"use client";

import { Bar, BarChart, CartesianGrid, Rectangle, XAxis, YAxis } from "recharts";
import type { BarShapeProps } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCompactPrice, formatPrice } from "@/lib/format";
import type { CategoryRevenue } from "../types/dashboard.types";
import { ChartDataTable } from "./chart-data-table";

interface CategoryBarsChartProps {
  data: CategoryRevenue[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
}

const chartConfig = {
  revenueCents: { label: "Ingresos", color: "var(--chart-1)" },
} satisfies ChartConfig;

const ROW_HEIGHT = 44;
const MIN_HEIGHT = 160;

export function CategoryBarsChart({
  data,
  selectedSlug,
  onSelect,
}: CategoryBarsChartProps) {
  const top = data[0];
  const ariaLabel = top
    ? `Gráfico de barras: ingresos por categoría. Mayor categoría: ${top.label} con ${formatPrice(top.revenueCents / 100)}. Use la tabla de datos para filtrar por categoría con el teclado.`
    : "Gráfico de barras: ingresos por categoría, sin datos.";

  const renderBar = (props: BarShapeProps) => {
    const slug = (props.payload as CategoryRevenue | undefined)?.slug;
    const dimmed = selectedSlug !== null && slug !== selectedSlug;
    return (
      <Rectangle
        {...props}
        fillOpacity={dimmed ? 0.3 : 1}
        style={{ cursor: "pointer" }}
      />
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingresos por categoría</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          role="img"
          aria-label={ariaLabel}
          className="aspect-auto w-full"
          style={{ height: Math.max(MIN_HEIGHT, data.length * ROW_HEIGHT + 32) }}
        >
          <BarChart
            data={data}
            layout="vertical"
            accessibilityLayer
            margin={{ left: 0, right: 12, top: 4, bottom: 4 }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              width={92}
              tickMargin={4}
            />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCompactPrice}
              minTickGap={24}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, _name, item) => (
                    <>
                      <span className="flex-1 text-muted-foreground">
                        {item.payload?.label}
                      </span>
                      <span className="font-medium text-foreground tabular-nums">
                        {formatPrice(Number(value) / 100)}
                      </span>
                    </>
                  )}
                />
              }
            />
            <Bar
              dataKey="revenueCents"
              fill="var(--color-revenueCents)"
              radius={4}
              barSize={22}
              isAnimationActive={false}
              shape={renderBar}
              onClick={(_, index) => {
                const row = data[index];
                if (row) onSelect(row.slug);
              }}
            />
          </BarChart>
        </ChartContainer>
        <ChartDataTable
          caption="Ingresos por categoría. Use el botón de cada fila para filtrar el panel."
          columns={[
            { id: "category", header: "Categoría" },
            { id: "revenue", header: "Ingresos", numeric: true },
            { id: "action", header: "Filtro", numeric: true },
          ]}
          rows={data.map((row) => {
            const pressed = row.slug === selectedSlug;
            return {
              id: row.slug,
              cells: {
                category: row.label,
                revenue: formatPrice(row.revenueCents / 100),
                action: (
                  <Button
                    type="button"
                    variant={pressed ? "default" : "outline"}
                    size="sm"
                    aria-pressed={pressed}
                    onClick={() => onSelect(row.slug)}
                  >
                    {pressed ? "Quitar filtro" : "Filtrar"}
                    <span className="sr-only"> {row.label}</span>
                  </Button>
                ),
              },
            };
          })}
        />
      </CardContent>
    </Card>
  );
}

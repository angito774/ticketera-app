import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ChartDataColumn {
  id: string;
  header: string;
  numeric?: boolean;
}

export interface ChartDataRow {
  id: string;
  cells: Record<string, ReactNode>;
}

interface ChartDataTableProps {
  caption: string;
  columns: ChartDataColumn[];
  rows: ChartDataRow[];
  summary?: string;
}

export function ChartDataTable({
  caption,
  columns,
  rows,
  summary = "Ver datos en tabla",
}: ChartDataTableProps) {
  return (
    <details className="group mt-3 text-sm">
      <summary className="w-fit cursor-pointer rounded-md px-1 text-muted-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
        {summary}
      </summary>
      <div className="mt-2 max-h-64 overflow-auto rounded-md border">
        <table className="w-full caption-top text-left text-sm">
          <caption className="px-3 py-2 text-left text-xs text-muted-foreground">
            {caption}
          </caption>
          <thead className="border-y bg-muted/50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={cn(
                    "px-3 py-1.5 font-medium",
                    column.numeric && "text-right"
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b last:border-b-0">
                {columns.map((column, index) => {
                  const className = cn(
                    "px-3 py-1.5",
                    column.numeric && "text-right tabular-nums"
                  );
                  return index === 0 ? (
                    <th
                      key={column.id}
                      scope="row"
                      className={cn(className, "font-normal")}
                    >
                      {row.cells[column.id]}
                    </th>
                  ) : (
                    <td key={column.id} className={className}>
                      {row.cells[column.id]}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

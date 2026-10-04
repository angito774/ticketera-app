import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  hrefFor: (page: number) => string;
  noun?: string;
}

const CONTROL =
  "inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-lg border px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:h-10 md:min-w-10";

function pageWindow(page: number, pageCount: number): (number | "ellipsis-start" | "ellipsis-end")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const result: (number | "ellipsis-start" | "ellipsis-end")[] = [];
  sorted.forEach((p, i) => {
    const prev = sorted[i - 1];
    if (prev !== undefined && p - prev > 1) result.push(prev === 1 ? "ellipsis-start" : "ellipsis-end");
    result.push(p);
  });
  return result;
}

export function Pagination({ page, pageCount, total, pageSize, hrefFor, noun = "resultados" }: PaginationProps) {
  if (total === 0) {
    return (
      <p aria-live="polite" className="text-sm text-muted-foreground">
        Sin resultados
      </p>
    );
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const atStart = page <= 1;
  const atEnd = page >= pageCount;

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <p aria-live="polite" className="text-sm text-muted-foreground">
        Mostrando {from}–{to} de {total} {noun}
      </p>
      <nav aria-label="Paginación">
        <ul className="flex flex-wrap items-center justify-center gap-1">
          <li>
            {atStart ? (
              <span aria-disabled="true" className={cn(CONTROL, "cursor-not-allowed opacity-50")}>
                <ChevronLeft className="size-4" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Anterior</span>
              </span>
            ) : (
              <Link href={hrefFor(page - 1)} className={cn(CONTROL, "hover:bg-accent")}>
                <ChevronLeft className="size-4" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Anterior</span>
              </Link>
            )}
          </li>
          {pageWindow(page, pageCount).map((item) =>
            typeof item === "string" ? (
              <li key={item} aria-hidden="true" className="px-1 text-muted-foreground">
                …
              </li>
            ) : (
              <li key={item}>
                <Link
                  href={hrefFor(item)}
                  aria-current={item === page ? "page" : undefined}
                  aria-label={`Página ${item}`}
                  className={cn(
                    CONTROL,
                    item === page ? "border-transparent bg-accent text-accent-foreground" : "hover:bg-accent",
                  )}
                >
                  {item}
                </Link>
              </li>
            ),
          )}
          <li>
            {atEnd ? (
              <span aria-disabled="true" className={cn(CONTROL, "cursor-not-allowed opacity-50")}>
                <span className="sr-only sm:not-sr-only">Siguiente</span>
                <ChevronRight className="size-4" aria-hidden="true" />
              </span>
            ) : (
              <Link href={hrefFor(page + 1)} className={cn(CONTROL, "hover:bg-accent")}>
                <span className="sr-only sm:not-sr-only">Siguiente</span>
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            )}
          </li>
        </ul>
      </nav>
    </div>
  );
}

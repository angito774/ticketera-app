import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { StickyBottomBar } from "@/components/sticky-bottom-bar";
import { buttonVariants } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PurchaseSummary as Summary } from "@/modules/tickets/store/purchase.store";

interface PurchaseSummaryProps {
  summary: Summary;
  checkoutHref: string;
  className?: string;
}

function ticketCountLabel(count: number): string {
  return count === 1 ? "1 entrada" : `${count} entradas`;
}

function ContinueAction({
  isEmpty,
  href,
  className,
}: {
  isEmpty: boolean;
  href: string;
  className?: string;
}) {
  const classes = cn(buttonVariants({ variant: "cta" }), "rounded-2xl text-base", className);

  if (isEmpty) {
    return (
      <span
        aria-disabled="true"
        className={cn(classes, "cursor-not-allowed bg-border text-muted-foreground hover:bg-border")}
      >
        Continuar
      </span>
    );
  }

  return (
    <Link href={href} className={classes}>
      Continuar
      <ArrowRight className="size-4.5" aria-hidden="true" />
    </Link>
  );
}

/** "Tu compra": tarjeta lateral en escritorio y barra fija con total + Continuar en móvil. */
export function PurchaseSummary({ summary, checkoutHref, className }: PurchaseSummaryProps) {
  const isEmpty = summary.ticketCount === 0;
  const total = formatPrice(summary.total);

  return (
    <>
      <aside
        aria-label="Resumen de la compra"
        className={cn(
          "hidden flex-col gap-5 rounded-3xl border bg-card p-7 shadow-[0_20px_40px_-28px_rgb(24_24_27/0.35)] lg:sticky lg:top-24 lg:flex",
          className
        )}
      >
        <h2 className="text-xl font-semibold">Tu compra</h2>

        {isEmpty ? (
          <p className="rounded-2xl border-[1.5px] border-dashed p-5 text-center text-sm leading-relaxed text-muted-foreground">
            Todavía no elegiste entradas. Toca una zona del mapa o usa los botones +.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {summary.lines.map((line) => (
              <li key={line.zoneId} className="flex flex-col gap-0.5">
                <span className="flex justify-between gap-3 text-[0.9375rem]">
                  <span>
                    {line.quantity} × {line.zoneName}
                  </span>
                  <span className="font-semibold tabular-nums">{formatPrice(line.amount)}</span>
                </span>
                {line.seatLabels.map((seatLabel) => (
                  <span key={seatLabel} className="text-[0.8125rem] text-muted-foreground">
                    {seatLabel}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-baseline justify-between border-t-[1.5px] border-dashed pt-4.5">
          <span className="text-[0.9375rem] font-medium">
            Total{" "}
            <span className="font-normal text-muted-foreground">
              ({ticketCountLabel(summary.ticketCount)})
            </span>
          </span>
          <span className="text-3xl font-bold tracking-tight tabular-nums">{total}</span>
        </div>

        <ContinueAction isEmpty={isEmpty} href={checkoutHref} className="h-14" />
      </aside>

      <StickyBottomBar>
        <span aria-live="polite" className="flex flex-col">
          <span className="text-xs text-muted-foreground">
            Total · {ticketCountLabel(summary.ticketCount)}
          </span>
          <span className="text-xl font-bold tracking-tight tabular-nums">{total}</span>
        </span>
        <ContinueAction isEmpty={isEmpty} href={checkoutHref} className="h-12 flex-1 sm:max-w-60" />
      </StickyBottomBar>
    </>
  );
}

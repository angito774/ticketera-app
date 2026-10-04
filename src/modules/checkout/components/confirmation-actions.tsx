"use client";

import Link from "next/link";
import { ArrowRight, Printer } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AddToCalendarButton } from "@/modules/checkout/components/add-to-calendar-button";
import type { OrderView } from "@/modules/checkout/services/order-read.service";
import type { EventDetail } from "@/modules/events/types/event.types";

interface ConfirmationActionsProps {
  order: Pick<OrderView, "number" | "tickets">;
  event: Pick<EventDetail, "title" | "date" | "venue" | "address" | "city">;
  className?: string;
}

const SECONDARY_CLASSES =
  "flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border-[1.5px] border-foreground px-5 text-[0.9375rem] font-semibold transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring";

export function ConfirmationActions({ order, event, className }: ConfirmationActionsProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center", className)}>
      <Link
        href="/my-tickets"
        className={cn(buttonVariants({ variant: "default" }), "h-12 gap-2 rounded-2xl px-5 text-[0.9375rem] font-semibold")}
      >
        Ver mis entradas
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
      <AddToCalendarButton order={order} event={event} className={SECONDARY_CLASSES} />
      <button type="button" onClick={() => window.print()} className={SECONDARY_CLASSES}>
        <Printer className="size-4.5" aria-hidden="true" />
        Imprimir
      </button>
    </div>
  );
}

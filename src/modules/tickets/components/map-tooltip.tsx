"use client";

import { useCallback, useRef, useState, type PointerEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface TooltipState {
  x: number;
  y: number;
  content: ReactNode;
}

/**
 * Tooltip que sigue al puntero dentro de un contenedor. Solo reacciona al mouse:
 * en pantallas táctiles el toque selecciona directamente y no se muestra.
 */
export function useMapTooltip<T extends HTMLElement = HTMLDivElement>() {
  const containerRef = useRef<T>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const show = useCallback((event: PointerEvent, content: ReactNode) => {
    if (event.pointerType !== "mouse" || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top, content });
  }, []);

  const hide = useCallback(() => setTooltip(null), []);

  return { containerRef, tooltip, show, hide };
}

export function MapTooltip({ tooltip, className }: { tooltip: TooltipState | null; className?: string }) {
  if (!tooltip) return null;
  return (
    <div
      role="presentation"
      style={{ left: tooltip.x, top: tooltip.y }}
      className={cn(
        "pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-xl bg-background px-3 py-2 text-sm whitespace-nowrap text-foreground shadow-lg ring-1 ring-black/5",
        className
      )}
    >
      {tooltip.content}
    </div>
  );
}

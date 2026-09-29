import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface StickyBottomBarProps {
  children: ReactNode;
  className?: string;
}

/**
 * Barra de acción fija abajo, solo en móvil (< lg). La página que la usa debe
 * reservar su alto con `pb-24 lg:pb-0` para que no tape contenido.
 */
export function StickyBottomBar({ children, className }: StickyBottomBarProps) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_32px_-24px_rgb(24_24_27/0.5)] lg:hidden",
        className
      )}
    >
      {children}
    </div>
  );
}

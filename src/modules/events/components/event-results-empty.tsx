import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EventResultsEmptyProps {
  onClear: () => void;
  className?: string;
}

export function EventResultsEmpty({ onClear, className }: EventResultsEmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-3xl border-[1.5px] border-dashed px-6 py-14 text-center",
        className
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-primary">
        <SearchX className="size-7" aria-hidden="true" />
      </span>
      <span className="text-lg font-semibold">No encontramos eventos con esos filtros</span>
      <span className="text-sm text-muted-foreground">
        Prueba quitando algún filtro o buscando otra ciudad.
      </span>
      <Button type="button" variant="outline" onClick={onClear} className="mt-2 h-11 rounded-xl px-5 text-[0.9375rem]">
        Limpiar filtros
      </Button>
    </div>
  );
}

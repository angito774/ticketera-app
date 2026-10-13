"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({ retry }: { error: Error; retry: () => void }) {
  return (
    <div role="alert" className="mx-auto flex w-full max-w-6xl flex-col items-start gap-3">
      <h1 className="text-2xl font-semibold">No pudimos cargar el panel</h1>
      <p className="text-sm text-muted-foreground">
        Ocurrió un error al calcular las métricas. Inténtalo de nuevo.
      </p>
      <Button type="button" onClick={() => retry()}>
        Reintentar
      </Button>
    </div>
  );
}

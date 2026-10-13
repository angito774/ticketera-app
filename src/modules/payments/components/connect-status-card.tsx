"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { startOnboardingAction } from "@/modules/payments/actions/connect.actions";
import { ConnectEmbedded } from "@/modules/payments/components/connect-embedded";
import type { ConnectStatus, OrganizationConnectView } from "@/modules/payments/types/connect.types";

const STATUS_LABEL: Record<ConnectStatus, string> = {
  not_started: "Sin conectar",
  pending: "Pendiente",
  active: "Activa",
  restricted: "Restringida",
};

const STATUS_VARIANT: Record<ConnectStatus, "default" | "secondary" | "destructive" | "outline"> = {
  not_started: "outline",
  pending: "secondary",
  active: "default",
  restricted: "destructive",
};

const DESCRIPTION: Record<ConnectStatus, string> = {
  not_started: "Conecta tu cuenta de pagos para poder publicar eventos y recibir tus ventas.",
  pending: "Completa la configuración de tu cuenta de pagos para poder publicar eventos.",
  active: "Cuenta lista",
  restricted: "Tu cuenta tiene requisitos vencidos. Continúa la configuración para reactivarla.",
};

interface ConnectStatusCardProps {
  view: OrganizationConnectView;
}

export function ConnectStatusCard({ view }: ConnectStatusCardProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { organizationId, name, status, hasAccount } = view;

  function handleStart() {
    setError(null);
    startTransition(async () => {
      const result = await startOnboardingAction({ organizationId });
      if (result.ok) {
        window.location.assign(result.url);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card id={`connect-${organizationId}`}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{name}</CardTitle>
          <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
        </div>
        <CardDescription>{DESCRIPTION[status]}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {status !== "active" && (
          <div>
            <Button type="button" disabled={pending} onClick={handleStart}>
              {status === "not_started" ? "Conectar cuenta de pagos" : "Continuar configuración"}
            </Button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {hasAccount && (
          <ConnectEmbedded
            organizationId={organizationId}
            variant={status === "active" ? "management" : "banner"}
          />
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import {
  ConnectAccountManagement,
  ConnectComponentsProvider,
  ConnectNotificationBanner,
} from "@stripe/react-connect-js";

import { createAccountSessionAction } from "@/modules/payments/actions/connect.actions";

interface ConnectEmbeddedProps {
  organizationId: string;
  variant: "banner" | "management";
}

export function ConnectEmbedded({ organizationId, variant }: ConnectEmbeddedProps) {
  const [instance] = useState(() =>
    loadConnectAndInitialize({
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
      fetchClientSecret: async () => {
        const result = await createAccountSessionAction({ organizationId });
        if (!result.ok) throw new Error(result.error);
        return result.clientSecret;
      },
    }),
  );

  return (
    <ConnectComponentsProvider connectInstance={instance}>
      {variant === "banner" ? <ConnectNotificationBanner /> : <ConnectAccountManagement />}
    </ConnectComponentsProvider>
  );
}

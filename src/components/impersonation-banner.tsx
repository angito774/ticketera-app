"use client";

import { useAuth, useClerk, useSession, useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { getSessionExpiryInfo } from "@/lib/session-expiry";
import { endImpersonationAction } from "@/modules/admin/actions/impersonation.actions";

const BANNER_HEIGHT_VAR = "--impersonation-banner-h";
const EXPIRY_CHECK_MS = 30_000;
const SIGN_IN_PATH = "/sign-in";

export function ImpersonationBanner() {
  const { isLoaded, actor } = useAuth();
  const { user } = useUser();
  const { session } = useSession();
  const { signOut } = useClerk();
  const bannerRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = isLoaded && Boolean(actor);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setNow(new Date()), EXPIRY_CHECK_MS);
    return () => clearInterval(id);
  }, [visible]);

  useEffect(() => {
    const element = bannerRef.current;
    if (!visible || !element) return;
    const root = document.documentElement;
    const publish = () => root.style.setProperty(BANNER_HEIGHT_VAR, `${element.offsetHeight}px`);
    publish();
    if (typeof ResizeObserver === "undefined") {
      return () => root.style.removeProperty(BANNER_HEIGHT_VAR);
    }
    const observer = new ResizeObserver(publish);
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty(BANNER_HEIGHT_VAR);
    };
  }, [visible]);

  if (!visible) return null;

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name = user?.fullName || email;
  const { label, expiringSoon } = getSessionExpiryInfo(session?.expireAt, now);

  async function handleEnd() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await endImpersonationAction();
      if (!result.ok) {
        setError(result.error);
        setPending(false);
        return;
      }
    } catch {
      setError("No se pudo terminar la impersonación. Inténtalo de nuevo.");
      setPending(false);
      return;
    }
    try {
      await signOut({ redirectUrl: SIGN_IN_PATH });
    } catch {
      // Full navigation: the session is already revoked server-side.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(SIGN_IN_PATH);
    }
  }

  return (
    <div
      ref={bannerRef}
      role="status"
      className="sticky top-0 z-[60] flex flex-col gap-2 border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-700 sm:flex-row sm:items-center sm:justify-between dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
    >
      <div className="flex flex-col gap-0.5">
        <p className="font-medium">
          Estás actuando como {name} ({email})
        </p>
        {label ? <p>Expira a las {label}</p> : null}
        {expiringSoon ? <p className="font-medium">Tu sesión de impersonación está por expirar</p> : null}
        {error ? (
          <p role="alert" className="font-medium">
            {error}
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={handleEnd}
        disabled={pending}
        className="min-h-11 shrink-0 focus-visible:ring-2 focus-visible:ring-amber-700 sm:min-h-8"
      >
        {pending ? "Cerrando…" : "Dejar de impersonar"}
      </Button>
    </div>
  );
}

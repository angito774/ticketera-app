"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ticket } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import { LoginForm } from "@/modules/account/components/login-form";
import { RegisterForm } from "@/modules/account/components/register-form";
import { safeNextPath } from "@/modules/account/services/auth.service";
import { useSessionStore } from "@/modules/account/store/session.store";

export type AuthMode = "login" | "register";

interface AuthPanelProps {
  initialMode: AuthMode;
  next: string | null;
}

const TABS: { mode: AuthMode; label: string }[] = [
  { mode: "login", label: "Iniciar sesión" },
  { mode: "register", label: "Crear cuenta" },
];

const BRAND_IMAGE =
  "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200&q=80";

/** Pantalla de acceso: panel de marca + pestañas de login y registro (sesión simulada). */
export function AuthPanel({ initialMode, next }: AuthPanelProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const user = useSessionStore((state) => state.user);
  const signOut = useSessionStore((state) => state.signOut);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const goNext = () => router.push(safeNextPath(next));

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Panel de marca: franja superior en móvil, columna izquierda en escritorio */}
      <section className="relative flex h-56 flex-col justify-between overflow-hidden bg-brand-deep p-5 text-white lg:h-auto lg:p-12">
        <Image src={BRAND_IMAGE} alt="" fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover opacity-60" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-brand-deep via-brand-deep/40 to-transparent" />
        <Link href="/" className="relative flex w-fit items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring">
          <span className="flex size-9.5 items-center justify-center rounded-xl bg-primary">
            <Ticket className="size-5" aria-hidden="true" />
          </span>
          <span className="text-xl font-bold tracking-tight">Ticketera</span>
        </Link>
        <div className="relative flex flex-col gap-1.5 lg:gap-3">
          <p className="text-2xl leading-tight font-bold tracking-tight text-balance lg:text-5xl">
            Tus entradas, siempre a mano.
          </p>
          <p className="text-brand-deep-foreground lg:text-lg">Compra en minutos y lleva tu QR en el celular.</p>
        </div>
      </section>

      <section className="flex items-start justify-center px-4 py-8 lg:items-center lg:px-8 lg:py-12">
        <div className="flex w-full max-w-md flex-col gap-7">
          {!hydrated ? (
            <div aria-busy="true" className="min-h-96" />
          ) : user ? (
            <div className="flex flex-col gap-4">
              <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Ya iniciaste sesión</h1>
              <p className="text-muted-foreground">
                Estás conectado como <strong className="font-semibold text-foreground">{user.name}</strong> ({user.email}).
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/my-tickets" className={cn(buttonVariants(), "h-12 flex-1 rounded-xl text-base font-semibold")}>
                  Ver mis entradas
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className="h-12 flex-1 cursor-pointer rounded-xl border font-semibold transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 rounded-2xl bg-muted p-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.mode}
                    type="button"
                    aria-pressed={mode === tab.mode}
                    onClick={() => setMode(tab.mode)}
                    className={cn(
                      "h-10 cursor-pointer rounded-xl text-sm transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring",
                      mode === tab.mode ? "bg-background font-semibold shadow-sm" : "font-medium text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {mode === "login" ? (
                <LoginForm onSuccess={goNext} onSwitchToRegister={() => setMode("register")} />
              ) : (
                <RegisterForm onSuccess={goNext} onSwitchToLogin={() => setMode("login")} />
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

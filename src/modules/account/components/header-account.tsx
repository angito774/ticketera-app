"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Ticket } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import { getInitials } from "@/modules/account/services/auth.service";
import { useSessionStore } from "@/modules/account/store/session.store";

/** Acciones de cuenta del header: acceso sin sesión, "Mis entradas" y salir con sesión (simulada). */
export function HeaderAccount() {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const user = useSessionStore((state) => state.user);
  const signOut = useSessionStore((state) => state.signOut);

  // Antes de hidratar se muestra el estado sin sesión, igual que el HTML del servidor.
  if (!hydrated || !user) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
          Iniciar sesión
        </Link>
        <Link href="/login?mode=register" className={buttonVariants({ variant: "default" })}>
          Registrarse
        </Link>
      </div>
    );
  }

  const isMyTickets = pathname === "/my-tickets";

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Link
        href="/my-tickets"
        aria-current={isMyTickets ? "page" : undefined}
        className={cn(buttonVariants({ variant: "ghost" }), "gap-1.5", isMyTickets && "text-primary")}
      >
        <Ticket className="size-4" aria-hidden="true" />
        <span className="max-sm:sr-only">Mis entradas</span>
      </Link>
      <span
        title={user.name}
        className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground"
      >
        <span aria-hidden="true">{getInitials(user.name)}</span>
        <span className="sr-only">Sesión de {user.name}</span>
      </span>
      <button
        type="button"
        onClick={() => {
          signOut();
          router.push("/");
        }}
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "cursor-pointer")}
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
      >
        <LogOut className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

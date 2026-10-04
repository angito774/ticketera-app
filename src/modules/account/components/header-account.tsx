"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { LayoutDashboard, ShieldCheck, Ticket } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Registra al usuario en la BD una sola vez por sesión del navegador (AC-9a). */
function useSyncUserOnSignIn() {
  const { isLoaded, isSignedIn, user } = useUser();
  const userId = user?.id;

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return;
    const key = `ticketera-synced:${userId}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      // sessionStorage no disponible: se intenta la sincronización igualmente
    }
    fetch("/api/auth/sync", { method: "POST" })
      .then((response) => {
        if (!response.ok) return;
        try {
          sessionStorage.setItem(key, "1");
        } catch {
          // sin marca: se reintentará en la siguiente carga
        }
      })
      .catch(() => {});
  }, [isLoaded, isSignedIn, userId]);
}

/** Acciones de cuenta del header: acceso sin sesión; "Mis entradas" y menú de usuario con sesión (Clerk). */
export function HeaderAccount() {
  const pathname = usePathname();
  const isMyTickets = pathname === "/my-tickets";
  useSyncUserOnSignIn();
  // `role` lo mantiene el servidor en publicMetadata (super_admin | admin | organizer); la autorización real se valida en servidor.
  const { user } = useUser();
  const role = user?.publicMetadata?.role;
  const canAdmin = role === "super_admin" || role === "admin";
  const canOrganize = canAdmin || role === "organizer";

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Show when="signed-out">
        <SignInButton>
          <Button variant="ghost">Iniciar sesión</Button>
        </SignInButton>
        <SignUpButton>
          <Button>Registrarse</Button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        {canAdmin && (
          <Link href="/admin" className={cn(buttonVariants({ variant: "ghost" }), "gap-1.5")}>
            <ShieldCheck className="size-4" aria-hidden="true" />
            <span className="max-sm:sr-only">Administración</span>
          </Link>
        )}
        {canOrganize && (
          <Link href="/organizer" className={cn(buttonVariants({ variant: "ghost" }), "gap-1.5")}>
            <LayoutDashboard className="size-4" aria-hidden="true" />
            <span className="max-sm:sr-only">Mis eventos</span>
          </Link>
        )}
        <Link
          href="/my-tickets"
          aria-current={isMyTickets ? "page" : undefined}
          className={cn(buttonVariants({ variant: "ghost" }), "gap-1.5", isMyTickets && "text-primary")}
        >
          <Ticket className="size-4" aria-hidden="true" />
          <span className="max-sm:sr-only">Mis entradas</span>
        </Link>
        <UserButton />
      </Show>
    </div>
  );
}

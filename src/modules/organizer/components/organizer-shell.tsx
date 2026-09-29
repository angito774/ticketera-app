"use client";

import { useRef, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ExternalLink, LayoutDashboard, LogOut, Menu, PlusCircle, Ticket, UserRound, X } from "lucide-react";

import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/modules/account/store/session.store";

interface OrganizerShellProps {
  children: ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  isActive: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/organizer", label: "Resumen", icon: LayoutDashboard, isActive: (path) => path === "/organizer" },
  {
    href: "/organizer/events/new",
    label: "Crear evento",
    icon: PlusCircle,
    isActive: (path) => path.startsWith("/organizer/events"),
  },
  { href: "/", label: "Ver sitio", icon: ExternalLink, isActive: () => false },
];

function Brand() {
  return (
    <Link href="/organizer" className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring">
      <span className="flex size-9.5 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Ticket className="size-5" aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-lg font-bold tracking-tight">Ticketera</span>
        <span className="text-xs text-muted-foreground">Organizadores</span>
      </span>
    </Link>
  );
}

function Navigation({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Panel" className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon, isActive }) => {
        const active = isActive(pathname);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-11 items-center gap-3 rounded-xl px-3 text-[0.9375rem] font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring",
              active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Account({ name, onSignOut }: { name: string; onSignOut: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <UserRound className="size-4.5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 text-sm leading-snug font-semibold break-words">{name}</span>
      <button
        type="button"
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        onClick={onSignOut}
        className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring"
      >
        <LogOut className="size-4.5" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Estructura del área de organizador: barra lateral en escritorio y barra superior con menú en móvil. */
export function OrganizerShell({ children }: OrganizerShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const user = useSessionStore((state) => state.user);
  const signOut = useSessionStore((state) => state.signOut);
  const menuRef = useRef<HTMLDialogElement>(null);

  const name = (hydrated && user?.name) || "Organizador demo";
  const handleSignOut = () => {
    signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-muted lg:pl-68">
      <aside className="fixed inset-y-0 left-0 hidden w-68 flex-col gap-8 border-r bg-background p-5 lg:flex">
        <Brand />
        <Navigation pathname={pathname} />
        <div className="mt-auto">
          <Account name={name} onSignOut={handleSignOut} />
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background px-4 lg:hidden">
        <Brand />
        <button
          type="button"
          aria-label="Abrir menú del panel"
          onClick={() => menuRef.current?.showModal()}
          className="flex size-10 cursor-pointer items-center justify-center rounded-xl border outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
      </header>

      <dialog
        ref={menuRef}
        aria-label="Menú del panel"
        className="m-0 ml-auto h-dvh max-h-none w-72 max-w-[85vw] bg-background p-5 text-foreground backdrop:bg-black/40 open:flex open:flex-col open:gap-6"
      >
        <div className="flex items-center justify-between">
          <Brand />
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => menuRef.current?.close()}
            className="flex size-10 cursor-pointer items-center justify-center rounded-xl border outline-none focus-visible:ring-3 focus-visible:ring-ring"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <Navigation pathname={pathname} onNavigate={() => menuRef.current?.close()} />
        <div className="mt-auto">
          <Account name={name} onSignOut={handleSignOut} />
        </div>
      </dialog>

      <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-28 md:px-6 lg:px-10 lg:pt-10 lg:pb-16">{children}</main>
    </div>
  );
}

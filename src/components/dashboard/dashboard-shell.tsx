"use client";

import { useRef, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Building2, Contact, ExternalLink, LayoutDashboard, LogOut, Menu, PlusCircle, ShieldCheck, Ticket, UserRound, Users, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { NavIcon, NavItem, NavSection } from "@/modules/auth/services/dashboard-nav";

interface DashboardShellProps {
  sections: NavSection[];
  user: { name: string; roleLabel: string };
  children: ReactNode;
}

const ICONS: Record<NavIcon, ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>> = {
  dashboard: LayoutDashboard,
  plus: PlusCircle,
  building: Building2,
  users: Users,
  contact: Contact,
  shield: ShieldCheck,
  external: ExternalLink,
};

const SITE_ITEM: NavItem = { href: "/", label: "Ver sitio", icon: "external" };

function isActive(item: NavItem, pathname: string) {
  return pathname === item.href || (item.matchPrefix !== undefined && pathname.startsWith(item.matchPrefix));
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring">
      <span className="flex size-9.5 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Ticket className="size-5" aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-lg font-bold tracking-tight">Ticketera</span>
        <span className="text-xs text-muted-foreground">Panel de gestión</span>
      </span>
    </Link>
  );
}

function NavLink({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  const Icon = ICONS[item.icon];
  const active = isActive(item, pathname);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-11 items-center gap-3 rounded-xl px-3 text-[0.9375rem] font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
      {item.label}
    </Link>
  );
}

function Navigation({ sections, pathname, onNavigate }: { sections: NavSection[]; pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Panel" className="flex flex-1 flex-col gap-5 overflow-y-auto">
      {sections.map((section, index) => (
        <div key={section.title ?? index} className="flex flex-col gap-1">
          {section.title && (
            <p className="px-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{section.title}</p>
          )}
          {section.items.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
      <div className="mt-auto">
        <NavLink item={SITE_ITEM} pathname={pathname} onNavigate={onNavigate} />
      </div>
    </nav>
  );
}

function Account({ name, roleLabel }: { name: string; roleLabel: string }) {
  const { signOut } = useClerk();
  return (
    <div className="flex items-center gap-3 rounded-2xl border p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <UserRound className="size-4.5" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <span className="text-sm leading-snug font-semibold break-words">{name}</span>
        <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground">{roleLabel}</span>
      </span>
      <button
        type="button"
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        onClick={() => signOut({ redirectUrl: "/" })}
        className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring"
      >
        <LogOut className="size-4.5" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Estructura compartida de los paneles de administración y organizador: barra lateral en escritorio y barra superior con menú en móvil. */
export function DashboardShell({ sections, user, children }: DashboardShellProps) {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDialogElement>(null);
  const closeMenu = () => menuRef.current?.close();

  return (
    <div className="min-h-screen bg-muted lg:pl-68">
      <aside className="fixed inset-y-0 left-0 hidden w-68 flex-col gap-8 border-r bg-background p-5 lg:flex">
        <Brand />
        <Navigation sections={sections} pathname={pathname} />
        <Account name={user.name} roleLabel={user.roleLabel} />
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
            onClick={closeMenu}
            className="flex size-10 cursor-pointer items-center justify-center rounded-xl border outline-none focus-visible:ring-3 focus-visible:ring-ring"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <Navigation sections={sections} pathname={pathname} onNavigate={closeMenu} />
        <Account name={user.name} roleLabel={user.roleLabel} />
      </dialog>

      <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-28 md:px-6 lg:px-10 lg:pt-10 lg:pb-16">{children}</main>
    </div>
  );
}

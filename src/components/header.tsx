import Link from "next/link";

import { cn } from "@/lib/utils";
import { HeaderAccount } from "@/modules/account/components/header-account";

interface HeaderProps {
  className?: string;
}

const CATEGORY_LINKS = [
  { label: "Eventos", href: "/events" },
  { label: "Conciertos", href: "/events?category=concert" },
  { label: "Teatro y espectáculos", href: "/events?category=theater" },
];

export function Header({ className }: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-border bg-background supports-[backdrop-filter]:bg-background/90 supports-[backdrop-filter]:backdrop-blur",
        className
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
        <Link
          href="/"
          className="cursor-pointer text-xl font-bold text-primary transition-colors hover:text-primary/80"
        >
          Ticketera
        </Link>

        <nav
          aria-label="Categorías de eventos"
          className="hidden items-center gap-6 md:flex"
        >
          {CATEGORY_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="cursor-pointer rounded-md text-sm font-medium text-foreground outline-none transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/organizer"
            className="hidden cursor-pointer text-sm font-medium text-muted-foreground transition-colors hover:text-primary lg:inline"
          >
            Vender entradas
          </Link>
          <HeaderAccount />
        </div>
      </div>

      {/* Móvil: las mismas categorías en una fila desplazable (en escritorio están arriba). */}
      <nav aria-label="Categorías de eventos" className="border-t md:hidden">
        <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2">
          {CATEGORY_LINKS.map((link) => (
            <li key={link.label} className="shrink-0">
              <Link
                href={link.href}
                className="flex h-11 items-center rounded-lg px-3 text-sm font-medium text-foreground outline-none transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

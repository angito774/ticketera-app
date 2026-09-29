import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
        "sticky top-0 z-50 border-b border-border bg-background",
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
              className="cursor-pointer text-sm font-medium text-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost">Iniciar sesión</Button>
          <Button variant="default">Registrarse</Button>
        </div>
      </div>
    </header>
  );
}

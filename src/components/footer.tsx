import { Camera, Share2, X } from "lucide-react";
import Link from "next/link";

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface FooterProps {
  className?: string;
}

interface FooterItem {
  label: string;
  /** Solo si el destino existe hoy; sin href se renderiza como texto. */
  href?: string;
}

interface FooterColumn {
  title: string;
  items: FooterItem[];
}

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Empresa",
    items: [
      { label: "Sobre nosotros" },
      { label: "Contacto" },
      { label: "Trabaja con nosotros" },
    ],
  },
  {
    title: "Ayuda",
    items: [{ label: "Centro de ayuda" }],
  },
  {
    title: "Legal",
    items: [
      { label: "Términos y condiciones" },
      { label: "Política de privacidad", href: "/privacidad" },
      { label: "Política de cookies" },
      { label: "Garantía y devoluciones" },
    ],
  },
];

const SOCIAL_LINKS = [
  { label: "Facebook", icon: Share2 },
  { label: "Instagram", icon: Camera },
  { label: "Twitter", icon: X },
];

export function Footer({ className }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn("border-t border-border bg-muted/30", className)}
    >
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div>
            <span className="text-xl font-bold text-primary">Ticketera</span>
            <p className="mt-2 text-sm text-muted-foreground">
              Descubre y compra entradas para los mejores eventos del Perú.
            </p>
            <div className="mt-4 flex items-center gap-3">
              {SOCIAL_LINKS.map(({ label, icon: Icon }) => (
                <span
                  key={label}
                  role="img"
                  aria-label={label}
                  className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              ))}
            </div>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-2">
                {column.items.map((item) => (
                  <li key={item.label} className="text-sm text-muted-foreground">
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="rounded-sm hover:text-foreground hover:underline focus-visible:text-foreground focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      item.label
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <p className="text-center text-sm text-muted-foreground sm:text-left">
          © {year} Ticketera. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}

import { BookOpen } from "lucide-react";
import Link from "next/link";

import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
} from "@/components/social-icons";
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
      { label: "Términos y condiciones", href: "/terminos" },
      { label: "Política de privacidad", href: "/privacidad" },
      { label: "Política de cookies", href: "/cookies" },
      { label: "Garantía y devoluciones", href: "/devoluciones" },
      { label: "Campañas comerciales", href: "/campanas-comerciales" },
    ],
  },
];

const SOCIAL_LINKS = [
  { label: "Facebook", icon: FacebookIcon },
  { label: "Instagram", icon: InstagramIcon },
  { label: "TikTok", icon: TikTokIcon },
  { label: "YouTube", icon: YouTubeIcon },
];

export function Footer({ className }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn("border-t border-indigo-200 bg-accent", className)}
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
                  className="flex size-10 items-center justify-center rounded-lg bg-indigo-100 text-accent-foreground"
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

        <Separator className="my-8 bg-indigo-200" />

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <p className="text-center text-sm text-muted-foreground sm:text-left">
            © {year} Ticketera. Todos los derechos reservados.
          </p>
          <Link
            href="/libro-de-reclamaciones"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-indigo-200 px-4 text-sm font-medium text-foreground hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BookOpen className="size-4" aria-hidden="true" />
            Libro de Reclamaciones
          </Link>
        </div>
      </div>
    </footer>
  );
}

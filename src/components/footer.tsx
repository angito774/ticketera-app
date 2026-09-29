import { Camera, Share2, X } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface FooterProps {
  className?: string;
}

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Empresa",
    links: [
      { label: "Sobre nosotros", href: "#" },
      { label: "Contacto", href: "#" },
      { label: "Trabaja con nosotros", href: "#" },
    ],
  },
  {
    title: "Ayuda",
    links: [
      { label: "Preguntas frecuentes", href: "#" },
      { label: "Soporte", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Términos y condiciones", href: "#" },
      { label: "Privacidad", href: "#" },
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
    <footer className={cn("border-t border-border bg-muted/30", className)}>
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div>
            <span className="text-xl font-bold text-primary">Ticketera</span>
            <p className="mt-2 text-sm text-muted-foreground">
              Descubre y compra entradas para los mejores eventos del Perú.
            </p>
            <div className="mt-4 flex items-center gap-3">
              {SOCIAL_LINKS.map(({ label, icon: Icon }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="cursor-pointer text-muted-foreground transition-colors hover:text-primary"
                >
                  <Icon className="size-5" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold text-foreground">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <p className="text-center text-sm text-muted-foreground">
          © {year} Ticketera. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}

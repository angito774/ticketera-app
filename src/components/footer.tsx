import { Camera, Share2, X } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface FooterProps {
  className?: string;
}

interface FooterColumn {
  title: string;
  /** Texto de las secciones; sin destino todavía, así que no son enlaces. */
  items: string[];
}

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Empresa",
    items: ["Sobre nosotros", "Contacto", "Trabaja con nosotros"],
  },
  {
    title: "Ayuda",
    items: ["Preguntas frecuentes", "Soporte"],
  },
  {
    title: "Legal",
    items: ["Términos y condiciones", "Privacidad"],
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
                <span key={label} role="img" aria-label={label} className="text-muted-foreground">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              ))}
            </div>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold text-foreground">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-2">
                {column.items.map((item) => (
                  <li key={item} className="text-sm text-muted-foreground">
                    {item}
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

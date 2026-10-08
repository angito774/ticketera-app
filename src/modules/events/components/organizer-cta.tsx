import Link from "next/link"

import { PAGE_SECTION_CLASSES } from "@/components/page-section"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const HEADING_ID = "organizer-cta-title"

interface OrganizerCtaProps {
  href?: string
  className?: string
}

export function OrganizerCta({
  href = "/organizer",
  className,
}: OrganizerCtaProps) {
  return (
    <section
      aria-labelledby={HEADING_ID}
      className={cn(PAGE_SECTION_CLASSES, className)}
    >
      <div className="rounded-3xl bg-brand-deep px-6 py-12 text-brand-deep-foreground md:px-12 md:py-16">
        <div className="flex max-w-2xl flex-col items-start gap-4">
          <p className="text-sm font-semibold tracking-widest uppercase">
            Para organizadores
          </p>
          <h2 id={HEADING_ID} className="text-3xl font-bold md:text-4xl">
            Vende tus entradas con Ticketera
          </h2>
          <p className="text-base md:text-lg">
            Crea tu evento, define zonas y precios y gestiona tus entradas desde
            un solo panel.
          </p>
          <Link
            href={href}
            className={cn(
              buttonVariants({ variant: "cta", size: "lg" }),
              "mt-2 h-11"
            )}
          >
            Publica tu evento
          </Link>
        </div>
      </div>
    </section>
  )
}

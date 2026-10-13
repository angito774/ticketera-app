import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export const PAGE_SECTION_CLASSES =
  "mx-auto w-full max-w-7xl px-4 py-12 md:px-6 md:py-16 lg:px-8"

interface PageSectionProps {
  /** id del h2; el <section> lo referencia con aria-labelledby. */
  id: string
  title: string
  /** Slot a la derecha del título (enlace "Ver todos", flechas...). */
  action?: ReactNode
  className?: string
  children: ReactNode
}

export function PageSection({
  id,
  title,
  action,
  className,
  children,
}: PageSectionProps) {
  return (
    <section
      aria-labelledby={id}
      className={cn(PAGE_SECTION_CLASSES, className)}
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 id={id} className="text-2xl font-bold md:text-3xl">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

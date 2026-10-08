import { CircleCheck, Search, Ticket, type LucideIcon } from "lucide-react"

import { PageSection } from "@/components/page-section"

interface HowItWorksStep {
  title: string
  text: string
  icon: LucideIcon
}

const STEPS: HowItWorksStep[] = [
  {
    title: "Buscar",
    text: "Encuentra el evento o artista que quieres ver.",
    icon: Search,
  },
  {
    title: "Elegir",
    text: "Selecciona tus entradas y la cantidad.",
    icon: Ticket,
  },
  {
    title: "Comprar",
    text: "Confirma tu compra y encuentra tus entradas al instante en Mis entradas.",
    icon: CircleCheck,
  },
]

export function HowItWorks() {
  return (
    <PageSection id="how-it-works-title" title="Tres pasos y ya estás dentro.">
      <ol className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
        {STEPS.map(({ title, text, icon: Icon }, index) => (
          <li key={title} className="flex flex-col gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Paso {index + 1}
            </p>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-muted-foreground">{text}</p>
          </li>
        ))}
      </ol>
    </PageSection>
  )
}

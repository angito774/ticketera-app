import { CircleCheck, ShieldCheck, Ticket, type LucideIcon } from "lucide-react"

import { PageSection } from "@/components/page-section"

interface TrustHighlight {
  title: string
  text: string
  icon: LucideIcon
}

const HIGHLIGHTS: TrustHighlight[] = [
  {
    title: "Tu cuenta, protegida",
    text: "Inicia sesión con tu correo o con Google. Solo tú ves tus compras.",
    icon: ShieldCheck,
  },
  {
    title: "Entradas digitales",
    text: "Cada entrada queda en Mis entradas con su código único, siempre a la mano.",
    icon: Ticket,
  },
  {
    title: "Tu lugar asegurado",
    text: "Reservamos tus asientos o cupos al comprar, sin sobreventa.",
    icon: CircleCheck,
  },
]

export function TrustHighlights() {
  return (
    <PageSection id="trust-highlights-title" title="Compra con confianza">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
        {HIGHLIGHTS.map(({ title, text, icon: Icon }) => (
          <div key={title} className="flex flex-col items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>
    </PageSection>
  )
}

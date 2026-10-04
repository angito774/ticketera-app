"use client"

import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface PromoBannerProps {
  title?: string
  subtitle?: string
  className?: string
}

function PromoBanner({
  title = "¿Quieres enterarte antes que nadie?",
  subtitle = "Suscríbete y recibe novedades de eventos, lanzamientos y preventas exclusivas directo en tu correo.",
  className,
}: PromoBannerProps) {
  // Aún no hay servicio de suscripciones: el envío no guarda nada y lo dice en pantalla.
  const [status, setStatus] = useState("")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus("Las suscripciones todavía no están disponibles.")
  }

  return (
    <section
      className={cn(
        "bg-surface-warm py-12 text-center md:py-16",
        className
      )}
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4">
        <h2 className="text-3xl font-bold text-foreground md:text-4xl">
          {title}
        </h2>
        <p className="text-base text-muted-foreground md:text-lg">
          {subtitle}
        </p>
        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-xl flex-col gap-2 sm:flex-row"
        >
          <Input
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="tu@email.com"
            className="h-11 flex-1"
            aria-label="Correo electrónico"
          />
          <Button
            type="submit"
            variant="default"
            size="lg"
            className="h-11 cursor-pointer"
          >
            Suscribirse
          </Button>
        </form>
        <p role="status" className={cn("text-sm text-muted-foreground", !status && "sr-only")}>
          {status}
        </p>
      </div>
    </section>
  )
}

export { PromoBanner }
export type { PromoBannerProps }

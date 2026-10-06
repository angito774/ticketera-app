"use client"

import { useId, useRef, useState, useTransition, type FormEvent } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { subscribeToNewsletterAction } from "@/modules/events/actions/newsletter.actions"
import { newsletterSubscribeSchema } from "@/modules/events/schemas/newsletter.schema"

const SUCCESS_MESSAGE = "¡Listo! Te suscribiste a nuestras novedades."
const PENDING_MESSAGE = "Enviando tu suscripción…"
const UNEXPECTED_ERROR =
  "No pudimos completar tu suscripción. Inténtalo de nuevo más tarde."

type BannerError = { message: string; field: boolean }

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
  const [email, setEmail] = useState("")
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<BannerError | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const errorId = `${inputId}-error`

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isPending) return

    setSuccess(false)
    const parsed = newsletterSubscribeSchema.safeParse({ email })
    if (!parsed.success) {
      setError({
        message: parsed.error.issues[0]?.message ?? "Ingresa un correo válido.",
        field: true,
      })
      inputRef.current?.focus()
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const result = await subscribeToNewsletterAction(parsed.data)
        if (result.ok) {
          setEmail("")
          setSuccess(true)
        } else {
          setError({ message: result.error, field: false })
        }
      } catch {
        setError({ message: UNEXPECTED_ERROR, field: false })
      }
    })
  }

  const status = isPending ? PENDING_MESSAGE : success ? SUCCESS_MESSAGE : ""

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
          noValidate
          className="flex w-full max-w-xl flex-col gap-2 sm:flex-row"
        >
          <label htmlFor={inputId} className="sr-only">
            Correo electrónico
          </label>
          <Input
            ref={inputRef}
            id={inputId}
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="tu@email.com"
            className="h-11 flex-1"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={error?.field ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
          <Button
            type="submit"
            variant="default"
            size="lg"
            className="h-11 cursor-pointer"
            aria-disabled={isPending}
          >
            {isPending ? "Suscribiendo…" : "Suscribirse"}
          </Button>
        </form>
        {error && (
          <p id={errorId} role="alert" className="text-sm text-destructive">
            {error.message}
          </p>
        )}
        <p
          role="status"
          className={cn("text-sm text-muted-foreground", !status && "sr-only")}
        >
          {status}
        </p>
        <p className="text-xs text-muted-foreground">
          Al suscribirte aceptas recibir novedades de eventos por correo. Consulta
          nuestra{" "}
          <Link
            href="/privacidad"
            className="rounded-sm underline underline-offset-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            política de privacidad
          </Link>
          .
        </p>
      </div>
    </section>
  )
}

export { PromoBanner }
export type { PromoBannerProps }

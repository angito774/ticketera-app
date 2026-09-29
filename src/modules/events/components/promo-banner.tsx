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
        <div className="flex w-full max-w-xl flex-col gap-2 sm:flex-row">
          <Input
            type="email"
            placeholder="tu@email.com"
            className="h-11 flex-1"
            aria-label="Correo electrónico"
          />
          <Button
            variant="default"
            size="lg"
            className="h-11 cursor-pointer"
          >
            Suscribirse
          </Button>
        </div>
      </div>
    </section>
  )
}

export { PromoBanner }
export type { PromoBannerProps }

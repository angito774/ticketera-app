import Form from "next/form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { EventCategory } from "@/modules/events/types/event.types"

interface EventFilterBarProps {
  className?: string
}

const CATEGORY_OPTIONS: { label: string; value: EventCategory }[] = [
  { label: "Conciertos", value: "concert" },
  { label: "Teatro y espectáculos", value: "theater" },
]

const CATEGORY_SELECT_ITEMS: Record<string, string> = {
  all: "Todas las categorías",
  ...Object.fromEntries(CATEGORY_OPTIONS.map((option) => [option.value, option.label])),
}

function EventFilterBar({ className }: EventFilterBarProps) {
  return (
    <Form action="/events" role="search" className={cn("flex flex-col gap-2 sm:flex-row", className)}>
      <Input
        type="search"
        name="q"
        placeholder="Buscar por nombre, artista o venue..."
        className="h-11 flex-1 md:h-10"
        aria-label="Buscar eventos"
      />
      <Select name="category" defaultValue="all" items={CATEGORY_SELECT_ITEMS}>
        <SelectTrigger className="h-11 w-full sm:w-56 md:h-10" aria-label="Filtrar por categoría">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las categorías</SelectItem>
          {CATEGORY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" className="h-11 px-5 md:h-10">
        Buscar
      </Button>
    </Form>
  )
}

export { EventFilterBar }
export type { EventFilterBarProps }

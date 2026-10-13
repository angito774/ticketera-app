"use client"

import Form from "next/form"
import { Search } from "lucide-react"

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
import {
  PRICE_RANGES,
  type PriceRangeKey,
} from "@/modules/events/schemas/event-filters.schema"
import type { FacetOption } from "@/modules/events/services/events.service"

interface HeroSearchBarProps {
  /** Meses ya calculados en el servidor ("2026-11" / "Noviembre 2026"). */
  monthOptions: Pick<FacetOption, "value" | "label">[]
  className?: string
}

const PRICE_KEYS = Object.keys(PRICE_RANGES) as PriceRangeKey[]

const PRICE_ITEMS: Record<string, string> = {
  all: "Cualquier precio",
  ...Object.fromEntries(PRICE_KEYS.map((key) => [key, PRICE_RANGES[key].label])),
}

const LABEL_CLASS = "text-xs font-semibold text-foreground"
const BLOCK_CLASS = "flex min-h-11 flex-1 flex-col justify-center gap-0.5 px-5 py-2"
const TRIGGER_CLASS =
  "-my-2 h-auto min-h-11 w-full rounded-md border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-transparent"

function HeroSearchBar({ monthOptions, className }: HeroSearchBarProps) {
  const monthItems: Record<string, string> = {
    all: "Cualquier fecha",
    ...Object.fromEntries(monthOptions.map((option) => [option.value, option.label])),
  }

  return (
    <Form
      action="/events"
      role="search"
      aria-label="Buscar eventos"
      className={cn(
        "flex flex-col divide-y divide-border rounded-2xl border bg-background shadow-sm md:flex-row md:items-center md:divide-x md:divide-y-0 md:rounded-full",
        className
      )}
    >
      <div className={BLOCK_CLASS}>
        <label htmlFor="hero-search-q" className={LABEL_CLASS}>
          Qué quieres ver
        </label>
        <Input
          id="hero-search-q"
          type="search"
          name="q"
          placeholder="Artista o evento"
          className="-my-2 h-11 rounded-md border-0 bg-transparent p-0 shadow-none focus-visible:border-0 focus-visible:ring-2 focus-visible:ring-ring dark:bg-transparent"
        />
      </div>
      <div className={BLOCK_CLASS}>
        <label htmlFor="hero-search-month" className={LABEL_CLASS}>
          Fecha
        </label>
        <Select name="month" defaultValue="all" items={monthItems}>
          <SelectTrigger id="hero-search-month" className={TRIGGER_CLASS}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Cualquier fecha</SelectItem>
            {monthOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className={BLOCK_CLASS}>
        <label htmlFor="hero-search-price" className={LABEL_CLASS}>
          Precio
        </label>
        <Select name="price" defaultValue="all" items={PRICE_ITEMS}>
          <SelectTrigger id="hero-search-price" className={TRIGGER_CLASS}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Cualquier precio</SelectItem>
            {PRICE_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {PRICE_RANGES[key].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="p-2 md:shrink-0">
        <Button
          type="submit"
          className="h-11 min-h-11 w-full rounded-full bg-primary px-6 text-white focus-visible:ring-2 focus-visible:ring-ring md:w-auto"
        >
          <Search aria-hidden="true" />
          Buscar
        </Button>
      </div>
    </Form>
  )
}

export { HeroSearchBar }
export type { HeroSearchBarProps }

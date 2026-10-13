"use client"

import * as React from "react"
import { format, parse } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { cn } from "cn"

import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const ISO_FORMAT = "yyyy-MM-dd"

interface DatePickerProps
  extends Omit<React.ComponentProps<"button">, "value" | "onChange" | "type"> {
  /** Fecha en formato `yyyy-MM-dd`; cadena vacía si no hay selección. */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Fechas anteriores a esta quedan deshabilitadas. */
  fromDate?: Date
}

function DatePicker({
  value,
  onChange,
  placeholder = "Elige una fecha",
  fromDate,
  className,
  disabled,
  ...props
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = value ? parse(value, ISO_FORMAT, new Date()) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        disabled={disabled}
        data-slot="date-picker"
        className={cn(
          "flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:h-10 md:text-sm dark:bg-input/30",
          !selected && "text-muted-foreground",
          className
        )}
        {...props}
      >
        <span className="truncate">
          {selected ? format(selected, "d MMM yyyy", { locale: es }) : placeholder}
        </span>
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          locale={es}
          selected={selected}
          defaultMonth={selected}
          disabled={fromDate ? { before: fromDate } : undefined}
          onSelect={(date) => {
            onChange(date ? format(date, ISO_FORMAT) : "")
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
export type { DatePickerProps }

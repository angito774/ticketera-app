"use client";

import { FieldError, FIELD_INPUT_CLASSES, fieldA11yProps } from "@/components/form-field";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TierFormValues, ZoneOption } from "@/modules/organizer/schemas/event-form.schema";

interface TicketTiersFieldProps {
  zones: ZoneOption[];
  tiers: TierFormValues[];
  errors?: Partial<Record<"price" | "quantity", string>>[];
  groupError?: string;
  disabled?: boolean;
  onChange: (tiers: TierFormValues[]) => void;
  idPrefix?: string;
}

const numberFormatter = new Intl.NumberFormat("es-PE");

export function tierFieldId(index: number, field: "price" | "quantity"): string {
  return `tier-${index}-${field}`;
}

export function tierToggleId(index: number): string {
  return `tier-${index}-enabled`;
}

/** Una fila por zona del recinto: se activa la venta, se fija el precio y, en zonas generales, la cantidad. */
export function TicketTiersField({
  zones,
  tiers,
  errors,
  groupError,
  disabled,
  onChange,
  idPrefix = "",
}: TicketTiersFieldProps) {
  if (zones.length === 0) {
    return (
      <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
        Elige un recinto para configurar sus entradas
      </p>
    );
  }

  const update = (index: number, patch: Partial<TierFormValues>) =>
    onChange(tiers.map((tier, position) => (position === index ? { ...tier, ...patch } : tier)));

  let capacity = 0;
  let minPrice: number | null = null;
  zones.forEach((zone, index) => {
    const tier = tiers[index];
    if (!tier?.enabled) return;
    capacity += zone.seating === "numbered" ? zone.seats : Number.parseInt(tier.quantity, 10) || 0;
    const price = Number.parseFloat(tier.price);
    if (Number.isFinite(price) && price >= 0 && (minPrice === null || price < minPrice)) minPrice = price;
  });

  const groupErrorId = `${idPrefix}tiers-group-error`;

  return (
    <div className="flex flex-col gap-3">
      {zones.map((zone, index) => {
        const tier = tiers[index] ?? { zoneId: zone.id, enabled: false, price: "", quantity: "" };
        const toggleId = `${idPrefix}${tierToggleId(index)}`;
        const descriptionId = `${toggleId}-description`;
        const priceId = `${idPrefix}${tierFieldId(index, "price")}`;
        const quantityId = `${idPrefix}${tierFieldId(index, "quantity")}`;
        const rowDisabled = disabled || !tier.enabled;
        const numbered = zone.seating === "numbered";

        return (
          <fieldset
            key={zone.id}
            disabled={disabled}
            className={cn("flex min-w-0 flex-col gap-3 rounded-2xl border p-4", tier.enabled && "bg-card")}
          >
            <legend className="sr-only">{zone.name}</legend>
            <div className="flex min-h-11 items-start gap-3">
              <Checkbox
                id={toggleId}
                checked={tier.enabled}
                disabled={disabled}
                aria-labelledby={`${toggleId}-label`}
                aria-describedby={groupError ? `${descriptionId} ${groupErrorId}` : descriptionId}
                aria-invalid={groupError ? true : undefined}
                onCheckedChange={(checked) => update(index, { enabled: checked === true })}
                className="mt-0.5 size-5"
              />
              <label htmlFor={toggleId} className="flex cursor-pointer flex-col gap-0.5">
                <span id={`${toggleId}-label`} className="text-sm font-semibold">
                  Vender entradas en {zone.name}
                </span>
                <span id={descriptionId} className="text-[0.8125rem] text-muted-foreground">
                  {numbered ? `Zona numerada · ${numberFormatter.format(zone.seats)} asientos` : "Zona general · cantidad libre"}
                </span>
              </label>
            </div>

            <div className={cn("grid gap-3", !numbered && "sm:grid-cols-2")}>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={priceId} className="text-sm font-medium">
                  Precio en soles<span className="sr-only"> de {zone.name}</span>
                </label>
                <div className="relative">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-muted-foreground"
                  >
                    S/
                  </span>
                  <Input
                    {...fieldA11yProps(priceId, errors?.[index]?.price)}
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0"
                    disabled={rowDisabled}
                    value={tier.price}
                    onChange={(event) => update(index, { price: event.target.value })}
                    className={cn(FIELD_INPUT_CLASSES, "h-11 pl-9")}
                  />
                </div>
                {errors?.[index]?.price && <FieldError id={priceId}>{errors[index].price}</FieldError>}
              </div>

              {numbered ? (
                <p className="flex items-end pb-2.5 text-sm text-muted-foreground">
                  Capacidad: {numberFormatter.format(zone.seats)} asientos
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={quantityId} className="text-sm font-medium">
                    Cantidad<span className="sr-only"> de entradas de {zone.name}</span>
                  </label>
                  <Input
                    {...fieldA11yProps(quantityId, errors?.[index]?.quantity)}
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    placeholder="0"
                    disabled={rowDisabled}
                    value={tier.quantity}
                    onChange={(event) => update(index, { quantity: event.target.value })}
                    className={cn(FIELD_INPUT_CLASSES, "h-11")}
                  />
                  {errors?.[index]?.quantity && <FieldError id={quantityId}>{errors[index].quantity}</FieldError>}
                </div>
              )}
            </div>
          </fieldset>
        );
      })}

      <div aria-live="polite">
        {groupError && <FieldError id={`${idPrefix}tiers-group`}>{groupError}</FieldError>}
      </div>

      <div aria-live="polite" className="flex flex-col gap-1 rounded-2xl bg-muted px-4 py-3 text-sm">
        <p className="flex items-center justify-between">
          <span className="text-muted-foreground">Capacidad total</span>
          <strong className="font-semibold tabular-nums">{numberFormatter.format(capacity)} entradas</strong>
        </p>
        <p className="flex items-center justify-between">
          <span className="text-muted-foreground">Desde</span>
          <strong className="font-semibold tabular-nums">{minPrice === null ? "S/ —" : formatPrice(minPrice)}</strong>
        </p>
      </div>
    </div>
  );
}

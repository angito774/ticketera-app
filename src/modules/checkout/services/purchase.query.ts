import { sql, type SQL } from "drizzle-orm";

export interface PricedItem {
  ticketTypeId: string;
  unitPriceCents: number;
  quantity: number;
  /** Asientos de evento comprados (zonas numeradas); vacío en zonas generales. */
  eventSeatIds: string[];
}

type SeatClaim = { from?: "available" | "held"; to?: "held" | "sold" };

/**
 * Reclama asientos: pasa de `from` (available) a `to` (sold) y aborta todo el batch (división por cero, 22012)
 * si no consiguió TODOS. Reservar: available -> held; confirmar pago: held -> sold.
 * El divisor depende de las filas realmente actualizadas; una constante `1/0` se evalúa al planificar.
 */
export function claimSeatsSql(eventSeatIds: string[], { from = "available", to = "sold" }: SeatClaim = {}): SQL {
  const ids = sql.join(
    eventSeatIds.map((id) => sql`${id}`),
    sql`, `,
  );
  return sql`with claimed as (
    update event_seats set status = ${sql.raw(`'${to}'`)}, updated_at = now()
    where id in (${ids}) and status = ${sql.raw(`'${from}'`)}
    returning id
  ) select 1 / (select (count(*) = ${eventSeatIds.length})::int from claimed)`;
}

/** Zona general: suma al vendido solo si cabe en el cupo; si no actualiza ninguna fila, divide por cero. */
export function reserveGeneralSql(ticketTypeId: string, quantity: number): SQL {
  return sql`with upd as (
    update ticket_types set quantity_sold = quantity_sold + ${quantity}, updated_at = now()
    where id = ${ticketTypeId}
      and (quantity_total is null or quantity_sold + ${quantity} <= quantity_total)
    returning id
  ) select 1 / (select count(*)::int from upd)`;
}

/** Zona numerada: el cupo lo controla el reclamo de asientos, así que el vendido sube sin tope. */
export function addSoldSql(ticketTypeId: string, quantity: number): SQL {
  return sql`update ticket_types set quantity_sold = quantity_sold + ${quantity}, updated_at = now()
    where id = ${ticketTypeId}`;
}

/**
 * Libera los asientos reservados (held -> available) de una orden. Se guía por los holds de la orden:
 * una vez borrados no queda nada que liberar, así que repetirlo no toca asientos de otro comprador.
 */
export function releaseSeatsSql(orderId: string): SQL {
  return sql`update event_seats set status = 'available', updated_at = now()
    where status = 'held' and id in (
      select event_seat_id from ticket_holds where order_id = ${orderId} and event_seat_id is not null
    )`;
}

/** Descuenta del vendido la cantidad reservada por los holds de la orden (idempotente: sin holds no resta). */
export function releaseHeldQuantitySql(orderId: string): SQL {
  return sql`update ticket_types tt set quantity_sold = tt.quantity_sold - h.qty, updated_at = now()
    from (
      select ticket_type_id, sum(quantity)::int as qty from ticket_holds where order_id = ${orderId} group by ticket_type_id
    ) h
    where tt.id = h.ticket_type_id`;
}

/**
 * Libera una orden ya vendida (sold -> available y descuento de `quantity_sold`). Solo actúa si la orden
 * sigue `paid`, por lo que debe ejecutarse antes de cambiar su estado dentro del mismo batch. La Fase 3 lo reutiliza.
 */
export function releaseSoldSql(orderId: string): SQL {
  return sql`with o as (select id from orders where id = ${orderId} and status = 'paid'),
    seats as (
      update event_seats set status = 'available', updated_at = now()
      where status = 'sold' and exists (select 1 from o) and id in (
        select t.event_seat_id from tickets t join order_items oi on oi.id = t.order_item_id
        where oi.order_id = ${orderId} and t.event_seat_id is not null
      )
      returning id
    )
    update ticket_types tt set quantity_sold = tt.quantity_sold - s.qty, updated_at = now()
    from (
      select ticket_type_id, sum(quantity)::int as qty from order_items
      where order_id = ${orderId} and exists (select 1 from o) group by ticket_type_id
    ) s
    where tt.id = s.ticket_type_id`;
}

export interface PurchaseRows {
  order: {
    id: string;
    userId: string;
    eventId: string;
    status: "pending";
    totalAmount: number;
    currency: "PEN";
    discountAmount: 0;
    expiresAt: Date;
  };
  orderItems: {
    id: string;
    orderId: string;
    ticketTypeId: string;
    quantity: number;
    unitPrice: number;
  }[];
  holds: {
    ticketTypeId: string;
    eventSeatId: string | null;
    quantity: number;
    userId: string;
    orderId: string;
    expiresAt: Date;
  }[];
}

/** Filas de la reserva: orden pending, sus ítems y los holds (uno por asiento numerado; uno por zona general). */
export function buildPurchaseRows(args: {
  orderId: string;
  userId: string;
  eventId: string;
  totalCents: number;
  items: PricedItem[];
  expiresAt: Date;
  newId: () => string;
}): PurchaseRows {
  const orderItems: PurchaseRows["orderItems"] = [];
  const holds: PurchaseRows["holds"] = [];
  for (const item of args.items) {
    orderItems.push({
      id: args.newId(),
      orderId: args.orderId,
      ticketTypeId: item.ticketTypeId,
      quantity: item.quantity,
      unitPrice: item.unitPriceCents,
    });
    const hold = { ticketTypeId: item.ticketTypeId, userId: args.userId, orderId: args.orderId, expiresAt: args.expiresAt };
    if (item.eventSeatIds.length > 0) {
      for (const eventSeatId of item.eventSeatIds) holds.push({ ...hold, eventSeatId, quantity: 1 });
    } else {
      holds.push({ ...hold, eventSeatId: null, quantity: item.quantity });
    }
  }
  return {
    order: {
      id: args.orderId,
      userId: args.userId,
      eventId: args.eventId,
      status: "pending",
      totalAmount: args.totalCents,
      currency: "PEN",
      discountAmount: 0,
      expiresAt: args.expiresAt,
    },
    orderItems,
    holds,
  };
}

export interface TicketRow {
  id: string;
  orderItemId: string;
  ticketTypeId: string;
  eventSeatId: string | null;
  qrCode: string;
  status: "valid";
}

/** Una entrada por unidad de cada ítem pagado; los asientos se asignan en orden (zonas generales: null). */
export function buildTicketRows(args: {
  items: { orderItemId: string; ticketTypeId: string; quantity: number; eventSeatIds: string[] }[];
  newId: () => string;
  newToken: () => string;
}): TicketRow[] {
  return args.items.flatMap((item) =>
    Array.from({ length: item.quantity }, (_, i) => ({
      id: args.newId(),
      orderItemId: item.orderItemId,
      ticketTypeId: item.ticketTypeId,
      eventSeatId: item.eventSeatIds[i] ?? null,
      qrCode: args.newToken(),
      status: "valid" as const,
    })),
  );
}

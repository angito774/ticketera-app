import { sql, type SQL } from "drizzle-orm";

export interface PricedItem {
  ticketTypeId: string;
  unitPriceCents: number;
  quantity: number;
  /** Asientos de evento comprados (zonas numeradas); vacío en zonas generales. */
  eventSeatIds: string[];
}

/**
 * Reclama asientos: pasa de available a sold y aborta todo el batch (división por cero, 22012) si no
 * consiguió TODOS. El divisor depende de las filas realmente actualizadas; una constante `1/0` se evalúa al planificar.
 */
export function claimSeatsSql(eventSeatIds: string[]): SQL {
  const ids = sql.join(
    eventSeatIds.map((id) => sql`${id}`),
    sql`, `,
  );
  return sql`with claimed as (
    update event_seats set status = 'sold', updated_at = now()
    where id in (${ids}) and status = 'available'
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

export interface PurchaseRows {
  order: {
    id: string;
    userId: string;
    eventId: string;
    status: "paid";
    totalAmount: number;
    currency: "PEN";
    discountAmount: 0;
  };
  orderItems: {
    id: string;
    orderId: string;
    ticketTypeId: string;
    quantity: number;
    unitPrice: number;
  }[];
  tickets: {
    id: string;
    orderItemId: string;
    ticketTypeId: string;
    eventSeatId: string | null;
    qrCode: string;
    status: "valid";
  }[];
}

export function buildPurchaseRows(args: {
  orderId: string;
  userId: string;
  eventId: string;
  totalCents: number;
  items: PricedItem[];
  newId: () => string;
  newToken: () => string;
}): PurchaseRows {
  const orderItems: PurchaseRows["orderItems"] = [];
  const tickets: PurchaseRows["tickets"] = [];
  for (const item of args.items) {
    const orderItemId = args.newId();
    orderItems.push({
      id: orderItemId,
      orderId: args.orderId,
      ticketTypeId: item.ticketTypeId,
      quantity: item.quantity,
      unitPrice: item.unitPriceCents,
    });
    for (let i = 0; i < item.quantity; i += 1) {
      tickets.push({
        id: args.newId(),
        orderItemId,
        ticketTypeId: item.ticketTypeId,
        eventSeatId: item.eventSeatIds[i] ?? null,
        qrCode: args.newToken(),
        status: "valid",
      });
    }
  }
  return {
    order: {
      id: args.orderId,
      userId: args.userId,
      eventId: args.eventId,
      status: "paid",
      totalAmount: args.totalCents,
      currency: "PEN",
      discountAmount: 0,
    },
    orderItems,
    tickets,
  };
}

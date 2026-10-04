// 4 parámetros por fila: 5000 filas = 20000, bajo el techo de 65535 parámetros de Postgres.
export const INSERT_CHUNK = 5000;

export interface EventSeatRow {
  eventId: string;
  venueSeatId: string;
  ticketTypeId: string;
  status: "available";
}

export function buildEventSeatRows(args: {
  eventId: string;
  ticketTypeId: string;
  venueSeatIds: string[];
}): EventSeatRow[] {
  return args.venueSeatIds.map((venueSeatId) => ({
    eventId: args.eventId,
    venueSeatId,
    ticketTypeId: args.ticketTypeId,
    status: "available" as const,
  }));
}

export function chunkRows<T>(rows: T[], size = INSERT_CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

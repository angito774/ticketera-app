import type { PaymentMethod } from "@/modules/checkout/schemas/checkout.schema";
import type { PurchaseLine } from "@/modules/tickets/store/purchase.store";

export interface OrderTicket {
  id: string;
  zoneName: string;
  /** "Fila B · Asiento 7" en zonas numeradas; null en zonas generales. */
  seatLabel: string | null;
}

/** Pedido mock generado en el cliente. Nunca contiene datos de tarjeta. */
export interface Order {
  number: string; // "TK-24817"
  eventId: string;
  buyerName: string;
  buyerEmail: string;
  paymentMethod: PaymentMethod;
  lines: PurchaseLine[];
  ticketCount: number;
  total: number;
  tickets: OrderTicket[];
  createdAt: string; // ISO 8601
}

import { formatPrice } from "@/lib/format";
import { REFUND_DEADLINE_TEXT } from "@/lib/refund-policy";

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

export function buildRefundEmail(input: {
  eventTitle: string;
  reasonLabel: string | null;
  amountCents: number;
  orderNumber: string;
}): { subject: string; html: string } {
  const title = escapeHtml(input.eventTitle);
  const amount = formatPrice(input.amountCents / 100);
  const reason = input.reasonLabel ? `<p>Motivo: ${escapeHtml(input.reasonLabel)}.</p>` : "";
  const html = [
    `<h1>Evento cancelado: ${title}</h1>`,
    `<p>Lamentamos informarte que el evento ${title} fue cancelado.</p>`,
    reason,
    `<p>Registramos la devolución del 100% de tu compra (orden ${escapeHtml(input.orderNumber)}) por ${amount}.</p>`,
    `<p>El monto se acreditará en tu medio de pago en un plazo de ${REFUND_DEADLINE_TEXT}.</p>`,
  ]
    .filter(Boolean)
    .join("\n");
  return { subject: `Evento cancelado: devolución de tu orden ${input.orderNumber}`, html };
}

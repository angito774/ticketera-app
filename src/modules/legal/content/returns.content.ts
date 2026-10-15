// Borrador técnico: validar con un abogado antes de publicar en producción; no es asesoría legal.
import { REFUND_DEADLINE_TEXT } from "@/lib/refund-policy";
import {
  LEGAL_CONFIG,
  type LegalConfig,
} from "@/modules/legal/content/legal-config";
import type {
  LegalDocument,
  LegalSection,
} from "@/modules/legal/types/legal.types";

const REQUEST_DEADLINE = `${REFUND_DEADLINE_TEXT} desde la solicitud`;

export function buildReturnsDocument(config: LegalConfig = {}): LegalDocument {
  const { brandName, legalName, customerServiceEmail, complaintsBookUrl } = config;
  const provider = legalName ?? "la plataforma";

  const sections: LegalSection[] = [
    {
      id: "alcance",
      title: "Alcance",
      paragraphs: [
        `Esta política explica cuándo y cómo puedes pedir la devolución de lo pagado por tus entradas${
          brandName ? ` en ${brandName}` : ""
        }, y qué garantía legal te asiste como consumidor.`,
        "Si el evento se cancela, el reembolso es automático y no necesitas solicitarlo. En los demás casos, las devoluciones se piden por correo electrónico.",
      ],
    },
    {
      id: "cancelacion-del-evento",
      title: "Cancelación del evento",
      paragraphs: [
        "Si el organizador cancela el evento, tienes derecho a la devolución del 100% del precio de la entrada. El reembolso es automático: no necesitas solicitarlo.",
        "El organizador indica uno de estos motivos al cancelar:",
      ],
      items: [
        "Artista enfermo o no disponible",
        "Desastre natural o sismo",
        "Orden de una autoridad",
        "Problema con el recinto",
        "Riesgo para la seguridad",
        "Otro motivo",
      ],
    },
    {
      id: "como-se-reembolsa",
      title: "Cómo se realiza el reembolso",
      paragraphs: [
        "Te avisamos por correo electrónico cuando se cancela el evento y cuando se procesa tu reembolso.",
        `El plazo de reembolso es de ${REFUND_DEADLINE_TEXT} desde la cancelación.`,
        "El reembolso se hace al medio de pago original con el que compraste.",
      ],
    },
    {
      id: "gastos-adicionales",
      title: "Gastos adicionales",
      paragraphs: [
        "No se reembolsan los gastos adicionales del comprador, como viaje, hospedaje y similares. El reembolso cubre solo el precio de la entrada.",
      ],
    },
    {
      id: "reprogramacion-o-cambios",
      title: "Reprogramación o cambios",
      paragraphs: [
        "Si el evento se reprograma o cambia su fecha, lugar u objeto y no aceptas el cambio, puedes pedir la devolución del 100% del valor pagado.",
        `El plazo de devolución es de ${REQUEST_DEADLINE}.`,
        "Para conciertos, la Ley N.º 32415 regula la venta y devolución de entradas y establece ese plazo (dato a verificar en la normativa vigente). Esa ley no aplica a eventos teatrales ni a eventos auspiciados por el Ministerio de Cultura.",
        `Para teatro y otros eventos no cubiertos por esa ley, ${provider} aplica el mismo criterio por decisión comercial propia, no por obligación de esa ley.`,
      ],
    },
    {
      id: "devolucion-a-pedido-del-cliente",
      title: "Devolución a pedido del cliente",
      paragraphs: [
        "Si el evento se realiza sin cambios, no procede la devolución por simple decisión del cliente, salvo lo que la ley reconozca al consumidor.",
      ],
    },
  ];

  if (customerServiceEmail) {
    sections.push({
      id: "como-solicitar-una-devolucion",
      title: "Cómo solicitar una devolución",
      paragraphs: [
        `Escribe a ${customerServiceEmail} indicando el "Pedido N.º" de la confirmación de compra, el nombre del evento y el código de tus entradas (visible en "Mis entradas").`,
        "Cada solicitud se atiende manualmente.",
      ],
    });
  }

  sections.push({
    id: "garantia-legal",
    title: "Garantía legal",
    paragraphs: [
      "Tus derechos como consumidor se rigen por el Código de Protección y Defensa del Consumidor (Ley N.º 29571).",
    ],
  });

  if (complaintsBookUrl) {
    sections.push({
      id: "reclamos",
      title: "Reclamos",
      paragraphs: [
        "Puedes presentar un reclamo en nuestro Libro de Reclamaciones. La respuesta se entrega en un máximo de 15 días hábiles, plazo del Reglamento del Libro de Reclamaciones.",
        ...(customerServiceEmail
          ? [`También puedes escribirnos a ${customerServiceEmail}.`]
          : []),
      ],
      links: [{ label: "Libro de Reclamaciones", href: complaintsBookUrl }],
    });
  } else if (customerServiceEmail) {
    sections.push({
      id: "reclamos",
      title: "Reclamos",
      paragraphs: [`Si tienes un reclamo, escríbenos a ${customerServiceEmail}.`],
    });
  }

  return {
    title: "Garantía y devoluciones",
    updatedAt: "2026-10-14T12:00:00-05:00",
    notice:
      brandName && legalName
        ? `${brandName} es una marca de ${legalName}`
        : undefined,
    sections,
  };
}

export const RETURNS_DOCUMENT: LegalDocument = buildReturnsDocument(LEGAL_CONFIG);

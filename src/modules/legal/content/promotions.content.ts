import {
  LEGAL_CONFIG,
  type LegalConfig,
} from "@/modules/legal/content/legal-config";
import type {
  LegalDocument,
  LegalSection,
} from "@/modules/legal/types/legal.types";

export function buildPromotionsDocument(config: LegalConfig = {}): LegalDocument {
  const { brandName, legalName, customerServiceEmail, complaintsBookUrl } = config;
  const provider = legalName ?? "la plataforma";

  const sections: LegalSection[] = [
    {
      id: "alcance",
      title: "Alcance",
      paragraphs: [
        `Estos términos aplican a toda campaña comercial${
          brandName ? ` de ${brandName}` : ""
        }: descuentos, ofertas por tiempo limitado, preventas, códigos promocionales y cualquier otra promoción sobre la venta de entradas.`,
        "Cada campaña puede publicar condiciones adicionales (bases) que se aplican junto con estos términos; si hay diferencia, prevalecen las bases de esa campaña.",
      ],
    },
    {
      id: "condiciones-de-cada-campana",
      title: "Condiciones de cada campaña",
      paragraphs: [
        "Antes de participar, cada campaña informa de forma clara y visible:",
      ],
      items: [
        "En qué consiste el beneficio (porcentaje, monto o ventaja).",
        "Fechas y horas de inicio y fin.",
        "Eventos, zonas o tipos de entrada a los que aplica.",
        "Cantidad máxima de entradas por persona, si existe.",
        "Stock o cupos limitados, si los hay.",
        "Restricciones, como no acumulación con otras promociones.",
      ],
    },
    {
      id: "vigencia-y-stock",
      title: "Vigencia y stock",
      paragraphs: [
        "La promoción rige solo durante el período indicado o hasta agotar el stock, lo que ocurra primero. El beneficio se confirma al completar el pago; agregar entradas al carrito no lo reserva.",
        "Las promociones no son canjeables por dinero ni transferibles, y no se aplican de forma retroactiva a compras ya realizadas.",
      ],
    },
    {
      id: "uso-indebido",
      title: "Uso indebido",
      paragraphs: [
        `${provider} puede anular las compras o beneficios obtenidos mediante fraude, uso de medios automatizados, reventa o cualquier uso contrario a las condiciones de la campaña. En ese caso se devuelve lo pagado.`,
      ],
    },
    {
      id: "modificacion-o-cancelacion",
      title: "Modificación o cancelación",
      paragraphs: [
        `${provider} puede modificar o dar por terminada una campaña por causas justificadas, informándolo en el sitio. Los cambios no afectan las compras ya confirmadas.`,
      ],
    },
    {
      id: "sorteos-y-concursos",
      title: "Sorteos y concursos",
      paragraphs: [
        "Si en el futuro se realizan sorteos o concursos con premios, se publicarán sus bases completas (participantes, mecánica, fecha, premios y forma de entrega) y se cumplirá la normativa peruana sobre promociones comerciales vigente en ese momento (dato a verificar antes de cada campaña).",
      ],
    },
    {
      id: "publicidad-veraz",
      title: "Publicidad veraz",
      paragraphs: [
        "La información de las promociones es veraz y no induce a error. Tus derechos se rigen por el Código de Protección y Defensa del Consumidor (Ley N.º 29571) y por las normas de publicidad y competencia desleal aplicables.",
      ],
    },
  ];

  if (customerServiceEmail || complaintsBookUrl) {
    sections.push({
      id: "consultas-y-reclamos",
      title: "Consultas y reclamos",
      paragraphs: [
        customerServiceEmail
          ? `Para consultas sobre una campaña escribe a ${customerServiceEmail}.`
          : "Puedes presentar tu reclamo sobre una campaña en nuestro Libro de Reclamaciones.",
        ...(complaintsBookUrl && customerServiceEmail
          ? ["También puedes presentar un reclamo en nuestro Libro de Reclamaciones."]
          : []),
      ],
      ...(complaintsBookUrl
        ? { links: [{ label: "Libro de Reclamaciones", href: complaintsBookUrl }] }
        : {}),
    });
  }

  return {
    title: "Términos de campañas comerciales",
    updatedAt: "2026-10-09T12:00:00-05:00",
    notice:
      brandName && legalName
        ? `${brandName} es una marca de ${legalName}`
        : undefined,
    sections,
  };
}

export const PROMOTIONS_DOCUMENT: LegalDocument =
  buildPromotionsDocument(LEGAL_CONFIG);

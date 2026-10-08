import { LEGAL_CONFIG, type LegalConfig } from "@/modules/legal/content/legal-config";
import type { LegalDocument, LegalSection } from "@/modules/legal/types/legal.types";

function buildProviderSection(config: LegalConfig): LegalSection | null {
  const { brandName, legalName, ruc, address } = config;
  if (!legalName) return null;

  const paragraphs = [
    brandName
      ? `${brandName} es una marca de ${legalName}. ${legalName} es el proveedor de la plataforma.`
      : `${legalName} es el proveedor de la plataforma.`,
  ];
  const items = [
    `Proveedor: ${legalName}`,
    ...(ruc ? [`RUC: ${ruc}`] : []),
    ...(address ? [`Domicilio: ${address}`] : []),
  ];

  return { id: "proveedor", title: "Información del proveedor", paragraphs, items };
}

function buildConsumerSection(config: LegalConfig): LegalSection | null {
  const { customerServiceEmail, complaintsBookUrl } = config;
  if (!customerServiceEmail) return null;

  const section: LegalSection = {
    id: "atencion",
    title: "Atención al consumidor",
    paragraphs: [
      `Para consultas, reclamos o solicitudes sobre tus compras, escríbenos a ${customerServiceEmail}.`,
    ],
  };
  if (complaintsBookUrl) {
    section.paragraphs.push("También puedes registrar un reclamo en nuestro Libro de Reclamaciones.");
    section.links = [{ label: "Libro de Reclamaciones", href: complaintsBookUrl }];
  }
  return section;
}

function buildLawSection(config: LegalConfig): LegalSection | null {
  if (!config.governingLaw) return null;
  return {
    id: "ley-aplicable",
    title: "Ley aplicable y jurisdicción",
    paragraphs: [
      `Ley aplicable y jurisdicción: ${config.governingLaw}.`,
      "Lo anterior se entiende sin perjuicio de los derechos que la ley reconoce al consumidor.",
    ],
  };
}

export function buildTermsDocument(config: LegalConfig = LEGAL_CONFIG): LegalDocument {
  const { brandName, legalName } = config;

  const sections: (LegalSection | null)[] = [
    buildProviderSection(config),
    {
      id: "objeto",
      title: "Objeto y aceptación",
      paragraphs: [
        "Estos términos regulan el uso de la plataforma y la compra de entradas para eventos publicados en ella.",
        "Al crear una cuenta, usar la plataforma o realizar una compra, declaras que los has leído y que los aceptas.",
      ],
    },
    {
      id: "cuenta",
      title: "Cuenta de usuario",
      paragraphs: [
        "Para comprar entradas y consultarlas necesitas una cuenta. Eres responsable de mantener la confidencialidad de tu acceso y de la actividad realizada desde tu cuenta.",
        "La información que proporciones debe ser veraz y estar actualizada.",
      ],
    },
    {
      id: "rol-plataforma",
      title: "Rol de la plataforma y del organizador",
      paragraphs: [
        "La plataforma permite a los organizadores publicar eventos y a los usuarios comprar entradas para ellos.",
        "El organizador es responsable de la realización del evento y de la información que publica sobre él, como fecha, lugar y condiciones de ingreso.",
      ],
    },
    {
      id: "compra",
      title: "Compra de entradas",
      paragraphs: [
        "Para comprar, eliges el evento, la cantidad de entradas y, cuando corresponda, los asientos, y pagas con el medio de pago habilitado en la plataforma.",
        "Al finalizar la compra se genera un pedido con su número, que puedes consultar en tu cuenta. La disponibilidad de entradas puede variar mientras completas el proceso.",
      ],
    },
    {
      id: "entradas",
      title: "Entradas digitales y acceso",
      paragraphs: [
        'Tus entradas quedan disponibles en la sección "Mis entradas" de tu cuenta, cada una con su código único.',
        "Las condiciones de ingreso al evento son las que defina el organizador.",
      ],
    },
    {
      id: "cancelaciones",
      title: "Cancelaciones y devoluciones",
      paragraphs: [
        "Las condiciones para cancelaciones, cambios de evento y devoluciones se detallan en la política de garantía y devoluciones.",
      ],
      links: [{ label: "Garantía y devoluciones", href: "/devoluciones" }],
    },
    {
      id: "obligaciones",
      title: "Obligaciones del usuario",
      paragraphs: ["Al usar la plataforma te comprometes a:"],
      items: [
        "Usarla de forma lícita y de buena fe.",
        "No intentar acceder sin autorización a cuentas, sistemas o datos de otras personas.",
        "No usar la plataforma de modo que perjudique a otros usuarios u organizadores.",
        "No interferir con el funcionamiento normal del servicio.",
      ],
    },
    {
      id: "propiedad-intelectual",
      title: "Propiedad intelectual",
      paragraphs: [
        `${
          brandName ?? "La plataforma"
        }, su diseño y sus contenidos pertenecen a ${legalName ?? "su titular"} o a sus respectivos titulares, y no puedes usarlos sin autorización.`,
        "Los nombres, imágenes y demás materiales de cada evento pertenecen a sus organizadores o titulares.",
      ],
    },
    {
      id: "datos-personales",
      title: "Datos personales",
      paragraphs: [
        "El tratamiento de tus datos personales y el uso de cookies y almacenamiento local se describen en nuestras políticas.",
      ],
      links: [
        { label: "Política de privacidad", href: "/privacidad" },
        { label: "Política de cookies", href: "/cookies" },
      ],
    },
    buildConsumerSection(config),
    {
      id: "cambios",
      title: "Cambios en los términos",
      paragraphs: [
        "Podemos actualizar estos términos. La fecha de la última actualización figura al final de este documento y el uso continuado de la plataforma implica la aceptación de la versión vigente.",
      ],
    },
    buildLawSection(config),
  ];

  return {
    title: "Términos y condiciones",
    notice: brandName && legalName ? `${brandName} es una marca de ${legalName}` : undefined,
    updatedAt: "2026-10-07T12:00:00-05:00",
    sections: sections.filter((section): section is LegalSection => section !== null),
  };
}

export const TERMS_DOCUMENT: LegalDocument = buildTermsDocument(LEGAL_CONFIG);

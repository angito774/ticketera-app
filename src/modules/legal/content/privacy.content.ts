import { LEGAL_CONFIG, type LegalConfig } from "@/modules/legal/content/legal-config";
import type { LegalDocument, LegalSection } from "@/modules/legal/types/legal.types";

export function buildPrivacyDocument(config: LegalConfig = LEGAL_CONFIG): LegalDocument {
  const { brandName, legalName, ruc, address, rightsEmail, retention, hosting } = config;

  const controllerItems = [
    legalName ? `Razón social: ${legalName}.` : null,
    ruc ? `RUC: ${ruc}.` : null,
    address ? `Domicilio: ${address}.` : null,
    rightsEmail ? `Correo de contacto: ${rightsEmail}.` : null,
  ].filter((item): item is string => item !== null);

  const sections: Array<LegalSection | null> = [
    {
      id: "responsable",
      title: "Responsable del tratamiento",
      paragraphs: [
        brandName && legalName
          ? `${brandName} es una marca de ${legalName}, responsable del tratamiento de los datos personales que se describen en esta política.`
          : "Esta política describe cómo se tratan los datos personales que se recopilan a través de la plataforma.",
      ],
      ...(controllerItems.length > 0 ? { items: controllerItems } : {}),
    },
    {
      id: "datos",
      title: "Datos que recopilamos",
      paragraphs: [
        "Según cómo uses la plataforma, guardamos los siguientes datos.",
        "Al suscribirte al newsletter solo recogemos tu correo electrónico; no pedimos ni guardamos otros datos en ese paso.",
        "El formulario de compra solicita nombre, documento, celular y método de pago, pero esos datos del formulario no se almacenan en nuestra base de datos.",
      ],
      items: [
        "Cuenta de usuario (sincronizada desde el servicio de autenticación): identificador de la cuenta, correo electrónico, nombre, URL de la imagen de perfil, si el correo está verificado, los proveedores de acceso usados y la fecha del último inicio de sesión.",
        "Compras: tus órdenes, el detalle de entradas de cada orden y las entradas emitidas, cada una con su código único y su estado.",
        "Newsletter: el correo electrónico que indicas al suscribirte y la fecha de suscripción.",
      ],
    },
    {
      id: "finalidades",
      title: "Finalidades",
      paragraphs: ["Usamos tus datos para:"],
      items: [
        "Crear y mantener tu cuenta y permitirte iniciar sesión.",
        "Registrar tus compras y mostrarte tus entradas en Mis entradas.",
        "Enviarte novedades de eventos por correo electrónico, solo si te suscribiste al newsletter.",
        "Atender las solicitudes que nos hagas por correo.",
      ],
    },
    {
      id: "consentimiento",
      title: "Consentimiento y base legal",
      paragraphs: [
        "Tratamos tus datos con tu consentimiento, que otorgas al crear tu cuenta, al aceptar los términos al comprar o al suscribirte al newsletter, y cuando es necesario para registrar y entregarte las entradas que compras.",
        "Esta política se redacta teniendo en cuenta la Ley N.º 29733 y el D.S. N.º 016-2024-JUS.",
      ],
    },
    {
      id: "destinatarios",
      title: "Destinatarios y encargados",
      paragraphs: [
        "Para operar la plataforma usamos estos servicios de terceros, que pueden tratar datos en nuestro nombre. No compartimos tu correo del newsletter con terceros.",
      ],
      items: [
        "Clerk: autenticación y gestión de cuentas.",
        "Neon: base de datos donde se guardan los datos descritos arriba.",
        hosting
          ? `${hosting}: alojamiento de la plataforma.`
          : "Proveedor de alojamiento de la plataforma.",
        "Unsplash: origen de las imágenes de ejemplo de los eventos.",
      ],
    },
    {
      id: "transferencia",
      title: "Transferencia internacional",
      paragraphs: [
        "Los servicios de terceros indicados pueden procesar o almacenar datos fuera del Perú. No detallamos la ubicación de sus servidores.",
      ],
    },
    retention
      ? {
          id: "conservacion",
          title: "Plazo de conservación",
          paragraphs: [`Conservamos tus datos ${retention}.`],
        }
      : null,
    {
      id: "derechos",
      title: "Derechos sobre tus datos y cómo ejercerlos",
      paragraphs: [
        "Puedes ejercer tus derechos de información, acceso, rectificación, cancelación y oposición.",
        rightsEmail
          ? `Envía tu solicitud por escrito a ${rightsEmail}. Este trámite se hace por correo; no existe un proceso automático.`
          : "Envía tu solicitud por escrito. Este trámite no es automático.",
        rightsEmail
          ? `Para darte de baja del newsletter no hay un mecanismo automático: la baja se tramita por correo a ${rightsEmail}.`
          : "Para darte de baja del newsletter no hay un mecanismo automático: la baja se tramita por escrito.",
        "Plazos de respuesta, contados desde el día siguiente a la recepción de tu solicitud (a verificar en la normativa vigente):",
      ],
      items: [
        "Información: 8 días hábiles.",
        "Acceso: 20 días hábiles.",
        "Rectificación, cancelación y oposición: 10 días hábiles.",
      ],
    },
    {
      id: "seguridad",
      title: "Seguridad",
      paragraphs: [
        "El acceso a la información está protegido por sesión y permisos verificados en el servidor. Ninguna medida de seguridad es infalible, por lo que no podemos garantizar una protección absoluta.",
      ],
    },
    {
      id: "cookies-almacenamiento",
      title: "Cookies y almacenamiento local",
      paragraphs: [
        "Usamos solo cookies de sesión y seguridad del servicio de autenticación, necesarias para iniciar sesión. No usamos cookies de analítica ni de publicidad. Además, usamos sessionStorage del navegador para recordar tu compra en curso y si tu cuenta ya se sincronizó; se borra al cerrar la pestaña.",
      ],
      links: [{ label: "Política de cookies", href: "/cookies" }],
    },
    {
      id: "cambios",
      title: "Cambios",
      paragraphs: [
        "Podemos actualizar esta política. La fecha de la última actualización figura al final de este documento.",
      ],
    },
  ];

  return {
    title: "Política de privacidad",
    intro: brandName
      ? `Esta política explica qué datos personales trata ${brandName}, para qué los usamos y cómo puedes ejercer tus derechos.`
      : "Esta política explica qué datos personales se tratan, para qué se usan y cómo puedes ejercer tus derechos.",
    notice:
      brandName && legalName ? `${brandName} es una marca de ${legalName}` : undefined,
    updatedAt: "2026-10-07T12:00:00-05:00",
    sections: sections.filter((section): section is LegalSection => section !== null),
  };
}

export const PRIVACY_DOCUMENT: LegalDocument = buildPrivacyDocument(LEGAL_CONFIG);

import { LEGAL_CONFIG, type LegalConfig } from "@/modules/legal/content/legal-config";
import type { LegalDocument, LegalSection } from "@/modules/legal/types/legal.types";

export function buildCookiesDocument(config: LegalConfig = {}): LegalDocument {
  const { brandName, legalName, customerServiceEmail } = config;
  const service = brandName ?? "el sitio";
  const owner = legalName ? ` Es operado por ${legalName}.` : "";

  const sections: LegalSection[] = [
    {
      id: "que-son",
      title: "Qué son las cookies",
      paragraphs: [
        "Las cookies son pequeños archivos que un sitio web guarda en tu navegador para recordar información entre una página y otra.",
        `Esta política explica qué cookies y qué almacenamiento del navegador usa ${service}.${owner}`,
      ],
    },
    {
      id: "cookies-que-usamos",
      title: "Cookies que usamos",
      paragraphs: [
        "Solo usamos cookies de sesión y seguridad del servicio de autenticación (Clerk), que se encarga de iniciar tu sesión y de mantenerla activa mientras navegas.",
        "No usamos cookies de analítica, de publicidad ni de seguimiento, ni píxeles de terceros.",
        "Por su función, las cookies de sesión y seguridad sirven para:",
      ],
      items: [
        "Reconocer que iniciaste sesión, para que no tengas que identificarte en cada página.",
        "Proteger tu cuenta y el proceso de inicio de sesión frente a usos no autorizados.",
        "Permitir que el servidor verifique tu sesión antes de mostrarte las secciones privadas, como Mis entradas.",
      ],
    },
    {
      id: "almacenamiento-local",
      title: "Almacenamiento local",
      paragraphs: [
        "Además de las cookies, usamos el almacenamiento de sesión del navegador (sessionStorage) en dos casos. Este almacenamiento queda en tu dispositivo y se borra al cerrar la pestaña. No usamos el almacenamiento local persistente (localStorage).",
      ],
      items: [
        "Proceso de compra (ticketera-purchase): recuerda el evento, las cantidades y los asientos que elegiste, para que no los pierdas si recargas la página durante la compra.",
        "Sincronización de tu cuenta (ticketera-synced): guarda una marca asociada a tu identificador de usuario que indica que tu cuenta ya se registró en este inicio de sesión, para no repetir ese registro en cada página.",
      ],
    },
    {
      id: "sin-consentimiento",
      title: "Por qué no pedimos consentimiento",
      paragraphs: [
        "Las cookies y el almacenamiento descritos son estrictamente necesarios para prestar el servicio que solicitas, como iniciar sesión y completar una compra. Como no usamos cookies de analítica ni de publicidad, no mostramos un aviso para aceptarlas o rechazarlas.",
        "Si en el futuro incorporáramos otras cookies, actualizaremos esta política.",
      ],
    },
    {
      id: "como-gestionarlas",
      title: "Cómo gestionarlas",
      paragraphs: [
        "Puedes ver, bloquear o eliminar las cookies y los datos del sitio desde la configuración de privacidad de tu navegador. El almacenamiento de sesión también se borra al cerrar la pestaña.",
        "Si bloqueas las cookies de sesión, no podrás iniciar sesión ni acceder a las secciones que la requieren, como Mis entradas o el proceso de compra.",
      ],
      links: [{ label: "Política de privacidad", href: "/privacidad" }],
    },
    {
      id: "cambios",
      title: "Cambios en esta política",
      paragraphs: [
        "Podemos actualizar esta política cuando cambien las cookies o el almacenamiento que usamos. La fecha de la última actualización figura al final de esta página.",
        ...(customerServiceEmail
          ? [`Si tienes dudas, escríbenos a ${customerServiceEmail}.`]
          : []),
      ],
    },
  ];

  return {
    title: "Política de cookies",
    updatedAt: "2026-10-07T12:00:00-05:00",
    ...(brandName && legalName ? { notice: `${brandName} es una marca de ${legalName}` } : {}),
    sections,
  };
}

export const COOKIES_DOCUMENT: LegalDocument = buildCookiesDocument(LEGAL_CONFIG);

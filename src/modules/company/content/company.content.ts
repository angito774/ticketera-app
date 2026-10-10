import { LEGAL_CONFIG } from "@/modules/legal/content/legal-config";
import type { CompanyDocument } from "@/modules/company/content/company.types";

const { brandName, legalName, address, customerServiceEmail } = LEGAL_CONFIG;

export const ABOUT_DOCUMENT: CompanyDocument = {
  title: "Sobre nosotros",
  intro: `${brandName} es la plataforma para descubrir eventos y comprar entradas en Perú de forma simple y segura. Somos una marca de ${legalName}.`,
  sections: [
    {
      id: "que-hacemos",
      title: "Qué hacemos",
      paragraphs: [
        "Conectamos a las personas con conciertos, teatro y otros espectáculos, y ayudamos a los organizadores a publicar sus eventos y vender sus entradas.",
      ],
    },
    {
      id: "que-ofrecemos",
      title: "Qué ofrecemos",
      paragraphs: [],
      items: [
        "Para el público: busca eventos, elige tus asientos y guarda tus entradas en “Mis entradas”.",
        "Para organizadores: un panel para crear y gestionar eventos y seguir sus ventas.",
        "Atención al cliente y Libro de Reclamaciones para cualquier consulta o reclamo.",
      ],
    },
    {
      id: "nuestro-compromiso",
      title: "Nuestro compromiso",
      paragraphs: [
        "Información clara antes de comprar, condiciones transparentes y respeto por tus derechos como consumidor.",
      ],
    },
  ],
  cta: { label: "Ver eventos", href: "/events" },
};

export const CONTACT_DOCUMENT: CompanyDocument = {
  title: "Contacto",
  intro: "Escríbenos y te responderemos por correo electrónico.",
  sections: [
    {
      id: "atencion-al-cliente",
      title: "Atención al cliente",
      paragraphs: [
        `Escríbenos a ${customerServiceEmail} para consultas sobre tus compras, entradas, devoluciones o campañas.`,
        "Si es sobre una compra, indica tu “Pedido N.º” y el nombre del evento para ayudarte más rápido.",
      ],
    },
    {
      id: "direccion",
      title: "Dirección",
      paragraphs: [`${legalName} · ${address}`],
    },
    {
      id: "reclamos",
      title: "Reclamos",
      paragraphs: [
        "Para presentar un reclamo o queja formal usa nuestro Libro de Reclamaciones.",
      ],
    },
  ],
  cta: { label: "Libro de Reclamaciones", href: "/libro-de-reclamaciones" },
};

export const CAREERS_DOCUMENT: CompanyDocument = {
  title: "Trabaja con nosotros",
  intro: `¿Quieres formar parte de ${brandName}? Por ahora no tenemos vacantes abiertas, pero nos interesa conocer tu perfil.`,
  sections: [
    {
      id: "como-postular",
      title: "Cómo postular",
      paragraphs: [
        `Envía tu CV a ${customerServiceEmail} con el asunto “Trabaja con nosotros” y cuéntanos en qué área te gustaría participar.`,
        "Guardaremos tu postulación y te contactaremos si surge una vacante acorde a tu perfil.",
      ],
    },
    {
      id: "datos-personales",
      title: "Tus datos",
      paragraphs: [
        "Usaremos tus datos solo para evaluar tu postulación. Consulta nuestra política de privacidad para conocer tus derechos.",
      ],
    },
  ],
  cta: { label: "Política de privacidad", href: "/privacidad" },
};

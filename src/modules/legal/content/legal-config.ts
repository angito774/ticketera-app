export interface LegalConfig {
  brandName?: string;
  legalName?: string;
  ruc?: string;
  address?: string;
  customerServiceEmail?: string;
  rightsEmail?: string;
  retention?: string;
  governingLaw?: string;
  hosting?: string;
  complaintsBookUrl?: string;
}

export const LEGAL_CONFIG: LegalConfig = {
  brandName: "Ticketera", // marca de TicketYa.com (confirmado por el usuario)
  legalName: "TicketYa.com",
  ruc: "20513249510", // pendiente de verificación por el titular (no confirmado en SUNAT)
  address: "Calle las Acasias Nro 1850", // sin distrito ni ciudad: el titular no los indicó
  customerServiceEmail: "atencion@inkasign.com",
  rightsEmail: "atencion@inkasign.com",
  retention: "mientras la cuenta esté activa",
  governingLaw: "leyes del Perú y tribunales de Lima",
  hosting: "Vercel",
  // complaintsBookUrl: se define en T-8 cuando exista /libro-de-reclamaciones
};

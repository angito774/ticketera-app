import { CLAIMS_PROVIDER } from "@/modules/claims/config/claims-provider";

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
  // Datos del proveedor compartidos con el Libro de Reclamaciones (una sola fuente).
  legalName: CLAIMS_PROVIDER.legalName,
  ruc: CLAIMS_PROVIDER.ruc, // pendiente de verificación por el titular (no confirmado en SUNAT)
  address: CLAIMS_PROVIDER.address, // sin distrito ni ciudad: el titular no los indicó
  customerServiceEmail: CLAIMS_PROVIDER.email,
  rightsEmail: CLAIMS_PROVIDER.email,
  retention: "mientras la cuenta esté activa",
  governingLaw: "leyes del Perú y tribunales de Lima",
  hosting: "Vercel",
  complaintsBookUrl: "/libro-de-reclamaciones",
};

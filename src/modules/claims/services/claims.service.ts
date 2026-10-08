import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { claims } from "@/db/schema";
import { addBusinessDays, toLimaDate } from "@/lib/business-days";
import { CLAIM_RESPONSE_BUSINESS_DAYS } from "../config/claims-provider";
import type { ClaimSubmitInput } from "../schemas/claim.schema";
import type { ClaimReceipt } from "../types/claim.types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function formatClaimCode(number: number, year: number): string {
  return `LR-${year}-${String(number).padStart(6, "0")}`;
}

// Entre este COUNT y el INSERT hay una ventana de carrera (neon-http no tiene transacciones):
// el tope por correo es una barrera simple, no una garantía estricta.
export async function countRecentClaimsByEmail(email: string, now: Date = new Date()): Promise<number> {
  const since = new Date(now.getTime() - DAY_MS);
  const [row] = await db
    .select({ total: count() })
    .from(claims)
    .where(and(eq(claims.email, email), gte(claims.createdAt, since)));
  return row?.total ?? 0;
}

export async function createClaim(input: ClaimSubmitInput, now: Date = new Date()): Promise<ClaimReceipt> {
  const registrationDate = toLimaDate(now);
  const dueDate = addBusinessDays(registrationDate, CLAIM_RESPONSE_BUSINESS_DAYS);
  const claimedAmountCents =
    input.claimedAmount === undefined ? null : Math.round(input.claimedAmount * 100);

  const [row] = await db
    .insert(claims)
    .values({
      type: input.type,
      fullName: input.fullName,
      documentType: input.documentType,
      documentNumber: input.documentNumber,
      address: input.address,
      phone: input.phone,
      email: input.email,
      isMinor: input.isMinor,
      guardianFullName: input.isMinor ? input.guardianFullName : null,
      guardianDocumentType: input.isMinor ? input.guardianDocumentType : null,
      guardianDocumentNumber: input.isMinor ? input.guardianDocumentNumber : null,
      itemType: input.itemType,
      itemDescription: input.itemDescription,
      claimedAmountCents,
      orderReference: input.orderReference ?? null,
      detail: input.detail,
      consumerRequest: input.consumerRequest,
      dueDate,
    })
    .returning({ number: claims.number, createdAt: claims.createdAt });

  if (!row) throw new Error("Claim insert returned no row");

  return {
    code: formatClaimCode(row.number, Number(registrationDate.slice(0, 4))),
    type: input.type,
    createdAt: row.createdAt.toISOString(),
    dueDate,
    fullName: input.fullName,
    documentType: input.documentType,
    documentNumber: input.documentNumber,
    address: input.address,
    phone: input.phone,
    email: input.email,
    isMinor: input.isMinor,
    ...(input.isMinor
      ? {
          guardianFullName: input.guardianFullName,
          guardianDocumentNumber: input.guardianDocumentNumber,
        }
      : {}),
    itemType: input.itemType,
    itemDescription: input.itemDescription,
    claimedAmountCents,
    ...(input.orderReference ? { orderReference: input.orderReference } : {}),
    detail: input.detail,
    consumerRequest: input.consumerRequest,
  };
}

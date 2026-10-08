import type { DocumentType } from "@/modules/checkout/schemas/checkout.schema";
import type { ClaimItemType, ClaimSubmitInput, ClaimType } from "../schemas/claim.schema";

export interface ClaimReceipt {
  code: string;
  type: ClaimType;
  createdAt: string;
  dueDate: string;
  fullName: string;
  documentType: DocumentType;
  documentNumber: string;
  address: string;
  phone: string;
  email: string;
  isMinor: boolean;
  guardianFullName?: string;
  guardianDocumentNumber?: string;
  itemType: ClaimItemType;
  itemDescription: string;
  claimedAmountCents: number | null;
  orderReference?: string;
  detail: string;
  consumerRequest: string;
}

export type SubmitClaimResult =
  | { ok: true; receipt: ClaimReceipt }
  | { ok: false; error: string; fieldErrors?: Partial<Record<keyof ClaimSubmitInput, string>> };

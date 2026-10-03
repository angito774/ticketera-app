import { z } from "zod";

export const PAGE_SIZE = 10;

const first = (value: unknown): unknown => (Array.isArray(value) ? value[0] : value);

const page = z.preprocess(first, z.unknown()).transform((v) => {
  const n = typeof v === "string" && /^\d+$/.test(v) ? Number(v) : NaN;
  return Number.isSafeInteger(n) && n >= 1 ? n : 1;
});

const q = z.preprocess(first, z.unknown()).transform((v) => {
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim().slice(0, 80).trim();
  return trimmed || undefined;
});

const role = z.preprocess(first, z.unknown()).transform((v) => {
  if (typeof v !== "string") return undefined;
  return v.trim() || undefined;
});

const org = z.preprocess(first, z.unknown()).transform((v) => {
  if (typeof v !== "string") return undefined;
  return v.trim() || undefined;
});

const status = z.preprocess(first, z.unknown()).transform((v): "verified" | "pending" | undefined =>
  v === "verified" || v === "pending" ? v : undefined,
);

export const userListQuerySchema = z.object({ page, q, role, org, status });

export type UserListQuery = {
  page: number;
  q?: string;
  role?: string;
  org?: string;
  status?: "verified" | "pending";
};

export function pageCount(total: number, pageSize: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export type AuditResult = "ok" | "error" | "denied";

export interface AuditMeta {
  action: string;
  targetType?: string;
  targetId?: string | null;
  organizationId?: string | null;
  input?: unknown;
}

export interface AuditEntry extends AuditMeta {
  result: AuditResult;
  errorCode?: string;
  metadata?: Record<string, unknown>;
}

export type ConnectStatus = "not_started" | "pending" | "active" | "restricted";

export type TransfersCapability =
  | "active"
  | "pending"
  | "restricted"
  | "inactive"
  | "unknown";

export interface ConnectAccountSnapshot {
  hasAccount: boolean;
  transfersCapability: TransfersCapability;
  requirementsCurrentlyDue: number;
  requirementsPastDue: number;
}

export interface OrganizationConnectView {
  organizationId: string;
  name: string;
  status: ConnectStatus;
  hasAccount: boolean;
}

export const CONNECTED_ACCOUNT_COUNTRY = "US";

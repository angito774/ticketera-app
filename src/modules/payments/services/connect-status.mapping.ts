import type {
  ConnectAccountSnapshot,
  ConnectStatus,
} from "../types/connect.types";

export function mapConnectStatus(snapshot: ConnectAccountSnapshot): ConnectStatus {
  if (!snapshot.hasAccount) return "not_started";

  if (
    snapshot.requirementsPastDue > 0 ||
    snapshot.transfersCapability === "restricted"
  ) {
    return "restricted";
  }

  if (
    snapshot.transfersCapability === "active" &&
    snapshot.requirementsCurrentlyDue === 0
  ) {
    return "active";
  }

  return "pending";
}

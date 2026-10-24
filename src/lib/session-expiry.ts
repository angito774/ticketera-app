export const EXPIRY_WARNING_MS = 5 * 60_000;

export interface SessionExpiryInfo {
  label: string | null;
  expiringSoon: boolean;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function getSessionExpiryInfo(
  expireAt: Date | null | undefined,
  now: Date = new Date(),
): SessionExpiryInfo {
  if (!expireAt || Number.isNaN(expireAt.getTime())) {
    return { label: null, expiringSoon: false };
  }
  return {
    label: `${pad(expireAt.getHours())}:${pad(expireAt.getMinutes())}`,
    expiringSoon: expireAt.getTime() - now.getTime() < EXPIRY_WARNING_MS,
  };
}

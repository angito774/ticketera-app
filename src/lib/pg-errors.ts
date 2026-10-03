const MAX_CAUSE_DEPTH = 5;

function hasPgCode(error: unknown, code: string, depth = 0): boolean {
  if (depth > MAX_CAUSE_DEPTH || typeof error !== "object" || error === null) return false;
  const e = error as { code?: unknown; cause?: unknown };
  return e.code === code || hasPgCode(e.cause, code, depth + 1);
}

export function isUniqueViolation(error: unknown): boolean {
  return hasPgCode(error, "23505");
}

export function isForeignKeyViolation(error: unknown): boolean {
  return hasPgCode(error, "23503");
}

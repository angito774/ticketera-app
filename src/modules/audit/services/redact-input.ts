const REDACTED = "[REDACTED]";
const CIRCULAR = "[Circular]";
const UNSERIALIZABLE = "[Unserializable]";
const MAX_STRING_LENGTH = 500;

const SENSITIVE_KEYS = new Set(
  [
    "password",
    "temporaryPassword",
    "token",
    "secret",
    "clientSecret",
    "authorization",
  ].map((key) => key.toLowerCase()),
);

function truncate(value: string): string {
  return value.length > MAX_STRING_LENGTH
    ? `${value.slice(0, MAX_STRING_LENGTH)}...[truncated]`
    : value;
}

function sanitize(value: unknown, ancestors: WeakSet<object>): unknown {
  switch (typeof value) {
    case "string":
      return truncate(value);
    case "number":
      return Number.isFinite(value) ? value : null;
    case "boolean":
      return value;
    case "bigint":
      return value.toString();
    case "undefined":
      return null;
    case "function":
    case "symbol":
      return UNSERIALIZABLE;
  }

  if (value === null) return null;
  const obj = value as object;

  if (ancestors.has(obj)) return CIRCULAR;
  if (obj instanceof Date) {
    return Number.isNaN(obj.getTime()) ? null : obj.toISOString();
  }

  ancestors.add(obj);
  try {
    if (Array.isArray(obj)) {
      return obj.map((item) => sanitize(item, ancestors));
    }
    if (obj instanceof Error) {
      return { name: obj.name, message: truncate(obj.message) };
    }

    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        result[key] = REDACTED;
        continue;
      }
      let child: unknown;
      try {
        child = (obj as Record<string, unknown>)[key];
      } catch {
        result[key] = UNSERIALIZABLE;
        continue;
      }
      if (child === undefined) continue;
      result[key] = sanitize(child, ancestors);
    }
    return result;
  } catch {
    return UNSERIALIZABLE;
  } finally {
    ancestors.delete(obj);
  }
}

export function redactInput(input: unknown): unknown {
  return sanitize(input, new WeakSet());
}

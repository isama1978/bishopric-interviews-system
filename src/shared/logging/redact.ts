import {
  EMAIL_PATTERN,
  MAX_CONTEXT_DEPTH,
  MAX_LOG_STRING_LENGTH,
  REDACTED,
  SENSITIVE_KEY_PATTERN,
  TOKEN_LIKE_PATTERN,
  TRUNCATED,
} from "@/shared/constants/logging.constants";

/** Quita correos y cadenas que parecen tokens de un texto, y lo acorta si es muy largo. */
export function scrubText(text: string): string {
  const clean = text.replace(EMAIL_PATTERN, REDACTED).replace(TOKEN_LIKE_PATTERN, REDACTED);
  return clean.length > MAX_LOG_STRING_LENGTH ? `${clean.slice(0, MAX_LOG_STRING_LENGTH)}…` : clean;
}

function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Un error se registra solo con su tipo y su código: el mensaje y la pila pueden contener datos
 * personales (por ejemplo, valores que devuelve la base). En desarrollo se agregan para depurar.
 */
function describeError(error: Error): Record<string, unknown> {
  const code = (error as { code?: unknown }).code;
  const base = { name: error.name, ...(typeof code === "string" ? { code } : {}) };
  return isDevelopment()
    ? { ...base, message: scrubText(error.message), stack: error.stack }
    : base;
}

/** Copia segura de cualquier valor para registrar: sin campos sensibles y con profundidad limitada. */
export function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > MAX_CONTEXT_DEPTH) return TRUNCATED;
  if (typeof value === "string") return scrubText(value);
  if (value === null || value === undefined) return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? "Invalid Date" : value.toISOString();
  if (value instanceof Error) return describeError(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeForLog(item, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : sanitizeForLog(item, depth + 1),
      ]),
    );
  }
  return undefined; // funciones y símbolos
}

import { UNSERIALIZABLE_CONTEXT } from "@/shared/constants/logging.constants";
import { sanitizeForLog, scrubText } from "./redact";

export type LogContext = Record<string, unknown>;
type LogLevel = "info" | "warn" | "error";

/** Destino de los registros (por defecto, la consola). Se reemplaza en las pruebas. */
export type LogSink = Record<LogLevel, (...args: unknown[]) => void>;

export interface Logger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

function safeContext(context: LogContext): unknown {
  try {
    return sanitizeForLog(context);
  } catch {
    return UNSERIALIZABLE_CONTEXT; // por ejemplo, un getter que lanza
  }
}

/**
 * Logger que nunca registra teléfonos, correos, cookies, tokens ni contraseñas. Pasar los datos
 * en `context` (no dentro del texto del mensaje): ahí se descartan los campos sensibles por nombre.
 */
export function createLogger(sink: LogSink = console): Logger {
  const write = (level: LogLevel, message: string, context?: LogContext): void => {
    const text = scrubText(message);
    if (context === undefined) {
      sink[level](text);
      return;
    }
    sink[level](text, safeContext(context));
  };
  return {
    info: (message, context) => write("info", message, context),
    warn: (message, context) => write("warn", message, context),
    error: (message, context) => write("error", message, context),
  };
}

export const logger: Logger = createLogger();

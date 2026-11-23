import type { ErrorCode } from "./error-codes";

/**
 * Base de los errores esperables del negocio.
 * - `code` es estable: la lógica y las rutas deciden por él, no por el nombre ni el texto.
 * - `message` es para los registros internos: nunca debe incluir datos personales.
 */
export abstract class DomainError extends Error {
  abstract readonly code: ErrorCode;

  protected constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export function isDomainError(value: unknown): value is DomainError {
  return value instanceof DomainError;
}

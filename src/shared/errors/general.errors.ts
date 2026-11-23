import { DomainError } from "./domain-error";
import { ERROR_CODES } from "./error-codes";

/** Datos de entrada inválidos. `fields` lleva solo nombres de campos, nunca sus valores. */
export class ValidationFailedError extends DomainError {
  readonly code = ERROR_CODES.VALIDATION_FAILED;
  readonly fields: readonly string[];

  constructor(fields: readonly string[] = []) {
    super("Los datos recibidos no son válidos.");
    this.fields = fields;
  }
}

export class NotFoundError extends DomainError {
  readonly code = ERROR_CODES.NOT_FOUND;
  constructor(entity: string) {
    super(`No se encontró: ${entity}.`);
  }
}

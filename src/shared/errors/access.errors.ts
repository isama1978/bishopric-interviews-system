import type { StaffRole } from "@/shared/constants/roles.constants";
import { DomainError } from "./domain-error";
import { ERROR_CODES } from "./error-codes";

export class NotAuthenticatedError extends DomainError {
  readonly code = ERROR_CODES.NOT_AUTHENTICATED;
  constructor() {
    super("No hay una sesión válida.");
  }
}

/** El usuario autenticado no tiene permiso para la acción (matriz de la sección 2). */
export class ForbiddenError extends DomainError {
  readonly code = ERROR_CODES.FORBIDDEN;
  constructor() {
    super("El usuario no tiene permiso para esta acción.");
  }
}

/** Se superó la cantidad máxima de usuarios activos del rol (1, 1 y 2). */
export class StaffRoleLimitReachedError extends DomainError {
  readonly code = ERROR_CODES.STAFF_ROLE_LIMIT_REACHED;
  constructor(role: StaffRole) {
    super(`Se alcanzó el máximo de usuarios activos para el rol ${role}.`);
  }
}

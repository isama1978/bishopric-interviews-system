import type { InterviewStatus } from "@/shared/constants/interview.constants";
import { DomainError } from "./domain-error";
import { ERROR_CODES } from "./error-codes";

/** Otra cita ocupa ese horario para el líder (regla 4). Concurrencia: viene de la base. */
export class SlotAlreadyTakenError extends DomainError {
  readonly code = ERROR_CODES.SLOT_ALREADY_TAKEN;
  constructor(options?: ErrorOptions) {
    super("El horario ya está ocupado para ese líder.", options);
  }
}

/** El miembro ya tiene otra cita que se solapa con ese horario. */
export class MemberAlreadyBookedError extends DomainError {
  readonly code = ERROR_CODES.MEMBER_ALREADY_BOOKED;
  constructor(options?: ErrorOptions) {
    super("El miembro ya tiene una cita en ese horario.", options);
  }
}

/** El horario pedido no forma parte de la grilla de esa jornada (día deshabilitado, fuera de rango, etc.). */
export class SlotNotOfferedError extends DomainError {
  readonly code = ERROR_CODES.SLOT_NOT_OFFERED;
  constructor() {
    super("El horario solicitado no se ofrece en esa jornada.");
  }
}

/** El líder no existe, está inactivo o no corresponde (regla 6). */
export class LeaderNotAvailableError extends DomainError {
  readonly code = ERROR_CODES.LEADER_NOT_AVAILABLE;
  constructor() {
    super("El líder no está disponible para entrevistas.");
  }
}

/** Una categoría sensible solo la atiende el obispo (regla 5). */
export class ForbiddenLeaderForCategoryError extends DomainError {
  readonly code = ERROR_CODES.FORBIDDEN_LEADER_FOR_CATEGORY;
  constructor() {
    super("La categoría solo puede ser atendida por el líder principal.");
  }
}

/** Se alcanzó AppConfig.maxOverbookingsPerDay (regla 12). */
export class OverbookingLimitReachedError extends DomainError {
  readonly code = ERROR_CODES.OVERBOOKING_LIMIT_REACHED;
  constructor() {
    super("Se alcanzó el máximo de sobreturnos de la jornada.");
  }
}

/** Las entrevistas de categorías sensibles no se reasignan (regla 11). */
export class SensitiveNotReassignableError extends DomainError {
  readonly code = ERROR_CODES.SENSITIVE_NOT_REASSIGNABLE;
  constructor() {
    super("Una entrevista de categoría sensible no se puede reasignar.");
  }
}

/** La cita no puede pasar de ese estado al pedido (sección 10 del diseño). */
export class InvalidStatusTransitionError extends DomainError {
  readonly code = ERROR_CODES.INVALID_STATUS_TRANSITION;
  constructor(from: InterviewStatus, to: InterviewStatus) {
    super(`Transición de estado no permitida: ${from} -> ${to}.`);
  }
}

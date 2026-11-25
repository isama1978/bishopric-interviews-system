import { STAFF_ROLES, type StaffRole } from "@/shared/constants/roles.constants";

/** Roles que atienden entrevistas. El secretario no tiene fila de líder. */
export type LeaderRole = Exclude<StaffRole, typeof STAFF_ROLES.SECRETARY>;

/** Lo mínimo de un líder para decidir si se ofrece. `isActive` ya combina el del líder y el de su usuario. */
export interface LeaderCandidate {
  role: LeaderRole;
  isActive: boolean;
}

/** Lo mínimo de una categoría (asunto) para decidir quién la puede atender. */
export interface InterviewCategoryRule {
  isSensitive: boolean;
}

export const LEADER_ELIGIBILITY = {
  ELIGIBLE: "ELIGIBLE",
  /** Corresponde al error `LEADER_NOT_AVAILABLE`. */
  NOT_AVAILABLE: "NOT_AVAILABLE",
  /** Corresponde al error `FORBIDDEN_LEADER_FOR_CATEGORY`. */
  FORBIDDEN_FOR_CATEGORY: "FORBIDDEN_FOR_CATEGORY",
} as const;

export type LeaderEligibility = (typeof LEADER_ELIGIBILITY)[keyof typeof LEADER_ELIGIBILITY];

/**
 * Decide si un líder puede atender una categoría (6.6):
 * - los asuntos sensibles solo los atiende el obispo (PRINCIPAL), esté como esté el resto;
 * - nadie inactivo se ofrece: un obispo relevado queda como registro inactivo y su reemplazo es
 *   el activo, y los consejeros solo se ofrecen si están activos.
 * La regla de categoría se evalúa primero porque no depende del estado del líder.
 */
export function checkLeaderEligibility(
  leader: LeaderCandidate,
  category: InterviewCategoryRule,
): LeaderEligibility {
  if (category.isSensitive && leader.role !== STAFF_ROLES.PRINCIPAL) {
    return LEADER_ELIGIBILITY.FORBIDDEN_FOR_CATEGORY;
  }
  return leader.isActive ? LEADER_ELIGIBILITY.ELIGIBLE : LEADER_ELIGIBILITY.NOT_AVAILABLE;
}

/**
 * Líderes que se ofrecen para una categoría, en el mismo orden en que llegan (el repositorio los
 * trae ordenados por `sortOrder`). Devuelve los mismos objetos recibidos, en una lista nueva.
 */
export function eligibleLeaders<T extends LeaderCandidate>(
  leaders: readonly T[],
  category: InterviewCategoryRule,
): T[] {
  return leaders.filter(
    (leader) => checkLeaderEligibility(leader, category) === LEADER_ELIGIBILITY.ELIGIBLE,
  );
}

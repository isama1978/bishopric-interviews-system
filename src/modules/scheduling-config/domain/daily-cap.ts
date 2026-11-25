import {
  AGENDA_OCCUPYING_STATUSES,
  type InterviewStatus,
} from "@/shared/constants/interview.constants";
import { INVALID_DAILY_CAP_MESSAGE, INVALID_USED_COUNT_MESSAGE } from "./schedule.constants";

/** Lo mínimo que hace falta saber de una entrevista para contarla contra el tope. */
export interface CappableInterview {
  status: InterviewStatus;
  isOverbooking: boolean;
}

/** Topes candidatos, del más específico al más general. `null` o ausente = no definido. */
export interface DailyCapSources {
  /** `LeaderDayOverride.maxInterviews` de esa fecha. */
  dayOverride?: number | null;
  /** `Leader.maxInterviewsPerDay`. */
  leader?: number | null;
}

function assertValidCap(cap: number): void {
  if (!Number.isSafeInteger(cap) || cap <= 0) {
    throw new Error(INVALID_DAILY_CAP_MESSAGE);
  }
}

/**
 * Tope diario efectivo: el ajuste del día, o si no hay, el del líder, o si tampoco, `null`
 * (sin tope). Un valor inválido (cero, negativo, decimal) lanza error: un `0` no significa
 * «sin tope», y la base ya impide guardarlo.
 */
export function resolveDailyCap({ dayOverride, leader }: DailyCapSources): number | null {
  const cap = dayOverride ?? leader ?? null;
  if (cap !== null) assertValidCap(cap);
  return cap;
}

/**
 * Cuántas entrevistas del líder en ese día cuentan contra el tope: las que ocupan agenda
 * (SCHEDULED, COMPLETED y NO_SHOW, igual que la restricción de solapamiento de la base).
 * Las canceladas liberan su lugar y los sobreturnos quedan fuera del tope.
 * Hay que pasar solo las entrevistas de ese líder en ese día local.
 */
export function countInterviewsTowardCap(interviews: readonly CappableInterview[]): number {
  return interviews.filter(
    (interview) => !interview.isOverbooking && AGENDA_OCCUPYING_STATUSES.includes(interview.status),
  ).length;
}

/** `true` si ya se alcanzó (o se superó, por ejemplo si se bajó el tope después) el máximo del día. */
export function hasReachedDailyCap(cap: number | null, usedCount: number): boolean {
  if (!Number.isSafeInteger(usedCount) || usedCount < 0) {
    throw new Error(INVALID_USED_COUNT_MESSAGE);
  }
  if (cap === null) return false;
  assertValidCap(cap);
  return usedCount >= cap;
}

/**
 * Aplica el tope a la grilla: con el tope alcanzado no se ofrece ningún horario; si no, se
 * ofrecen todos los libres (quién llega primero se queda con el lugar y cada reserva suma
 * al conteo). No recorta la grilla a «lo que queda»: no importa cuál horario se elija.
 * La reserva tiene que volver a comprobar el tope dentro de la misma transacción que la crea.
 */
export function applyDailyCap(
  slots: readonly number[],
  cap: number | null,
  usedCount: number,
): number[] {
  return hasReachedDailyCap(cap, usedCount) ? [] : [...slots];
}

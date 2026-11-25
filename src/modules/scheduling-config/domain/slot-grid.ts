import type { Workday } from "./schedule";
import { INVALID_INTERVIEW_MINUTES_MESSAGE } from "./schedule.constants";

/** Duraciones candidatas, de la más específica a la más general. `null` o ausente = no definida. */
export interface InterviewMinutesSources {
  /** `LeaderDayOverride.minutesPerInterview` de esa fecha. */
  dayOverride?: number | null;
  /** `Leader.minutesPerInterview`. */
  leader?: number | null;
  /** `AppConfig.defaultMinutesPerInterview`: siempre existe. */
  global: number;
}

/** Lanza si la duración no es un entero positivo (evita ciclos infinitos y intervalos vacíos). */
export function assertValidInterviewMinutes(minutes: number): void {
  if (!Number.isSafeInteger(minutes) || minutes <= 0) {
    throw new Error(INVALID_INTERVIEW_MINUTES_MESSAGE);
  }
}

/**
 * Duración efectiva de una entrevista (6.3): el ajuste del líder para esa fecha, o si no hay,
 * la duración del líder, o si tampoco, el valor global. Un valor inválido (cero, negativo o con
 * decimales) lanza error en vez de saltearse en silencio: la base ya lo impide, así que
 * indicaría un fallo de programación.
 */
export function resolveInterviewMinutes({
  dayOverride,
  leader,
  global,
}: InterviewMinutesSources): number {
  const minutes = dayOverride ?? leader ?? global;
  assertValidInterviewMinutes(minutes);
  return minutes;
}

/**
 * Grilla de horarios de una jornada (6.2): los minutos de inicio desde `startMinute`, de a
 * `minutesPerInterview`, mientras el inicio sea menor o igual a `lastStartMinute` (el último
 * horario es el último INICIO permitido; su fin puede pasar de esa hora).
 *
 * Martes 19:00 a 21:30 de a 30 minutos: 1140, 1170, 1200, 1230, 1260, 1290.
 */
export function buildSlotGrid(
  workday: Pick<Workday, "startMinute" | "lastStartMinute">,
  minutesPerInterview: number,
): number[] {
  assertValidInterviewMinutes(minutesPerInterview);
  const slots: number[] = [];
  for (
    let minute = workday.startMinute;
    minute <= workday.lastStartMinute;
    minute += minutesPerInterview
  ) {
    slots.push(minute);
  }
  return slots;
}

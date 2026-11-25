import { weekdayOfDate } from "@/shared/time/calendar-date";

/** Regla recurrente por día de la semana (`SchedulePattern`). 0 = domingo ... 6 = sábado. */
export interface SchedulePattern {
  weekday: number;
  /** Minutos desde las 00:00 (19:00 = 1140). */
  startMinute: number;
  /** Inicio de la última entrevista (21:30 = 1290). */
  lastStartMinute: number;
  isEnabled: boolean;
}

/** Excepción para una fecha concreta (`ScheduleDay`): habilita o deshabilita ese día. */
export interface ScheduleDay {
  /** `AAAA-MM-DD`. */
  date: string;
  isEnabled: boolean;
  /** Si es `null`, el día usa el horario de la regla semanal. */
  startMinute: number | null;
  lastStartMinute: number | null;
}

/** Jornada de atención de una fecha: desde qué minuto se agenda y cuál es el último inicio. */
export interface Workday {
  date: string;
  startMinute: number;
  lastStartMinute: number;
}

function findPattern(
  date: string,
  patterns: readonly SchedulePattern[],
): SchedulePattern | undefined {
  const weekday = weekdayOfDate(date);
  return patterns.find((pattern) => pattern.weekday === weekday);
}

function workdayFromRange(
  date: string,
  range: { startMinute: number | null; lastStartMinute: number | null } | undefined,
): Workday | null {
  if (range === undefined || range.startMinute === null || range.lastStartMinute === null)
    return null;
  return { date, startMinute: range.startMinute, lastStartMinute: range.lastStartMinute };
}

/**
 * Resuelve la jornada de una fecha (`AAAA-MM-DD`), o `null` si ese día no se atiende.
 *
 * 1. Si hay una excepción para la fecha, manda ella: deshabilitada, no hay jornada; habilitada,
 *    usa su propio horario o, si no lo tiene, el de la regla semanal de ese día de la semana
 *    (aunque esa regla esté deshabilitada: así se habilita puntualmente un día que no se atiende).
 * 2. Si no hay excepción, se usa la regla semanal si está habilitada.
 * 3. Un día habilitado por excepción sin horario propio y sin regla semanal no tiene jornada
 *    (configuración incompleta que el dashboard no debería permitir).
 */
export function resolveWorkday(
  date: string,
  patterns: readonly SchedulePattern[],
  exceptions: readonly ScheduleDay[],
): Workday | null {
  const pattern = findPattern(date, patterns);
  const exception = exceptions.find((candidate) => candidate.date === date);

  if (exception === undefined) {
    return pattern?.isEnabled ? workdayFromRange(date, pattern) : null;
  }
  if (!exception.isEnabled) return null;
  return workdayFromRange(date, exception) ?? workdayFromRange(date, pattern);
}

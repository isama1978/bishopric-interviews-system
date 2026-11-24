import { DEFAULT_TIMEZONE } from "@/shared/constants/scheduling.constants";
import {
  INVALID_MINUTE_OF_DAY_MESSAGE,
  MILLISECONDS_PER_DAY,
  MILLISECONDS_PER_MINUTE,
} from "@/shared/constants/time.constants";
import { minuteOfDaySchema } from "@/shared/validation";
import { addDays, parseCalendarDate } from "./calendar-date";
import { getOffsetMs } from "./time-zone";

/** Rango de un día local en UTC: `start` incluido, `end` excluido (el comienzo del día siguiente). */
export interface LocalDayRange {
  start: Date;
  end: Date;
}

function wallClockAsUtcMs(date: string, minuteOfDay: number): number {
  const { year, month, day } = parseCalendarDate(date);
  return Date.UTC(year, month - 1, day) + minuteOfDay * MILLISECONDS_PER_MINUTE;
}

/**
 * De una fecha y un minuto del día en `timeZone` al instante UTC (por ejemplo, para `startsAt`).
 *
 * Con horario de verano hay dos casos raros, resueltos como el estándar de JavaScript:
 * - hora repetida (el reloj se atrasa): se toma la primera ocurrencia;
 * - hora inexistente (el reloj se adelanta): se corre hacia adelante.
 * Córdoba no tiene horario de verano, pero `AppConfig.timezone` es configurable.
 */
export function localToInstant(
  date: string,
  minuteOfDay: number,
  timeZone: string = DEFAULT_TIMEZONE,
): Date {
  if (!minuteOfDaySchema.safeParse(minuteOfDay).success) {
    throw new Error(INVALID_MINUTE_OF_DAY_MESSAGE);
  }
  const wallMs = wallClockAsUtcMs(date, minuteOfDay);
  const offsetBefore = getOffsetMs(new Date(wallMs - MILLISECONDS_PER_DAY), timeZone);
  const offsetAfter = getOffsetMs(new Date(wallMs + MILLISECONDS_PER_DAY), timeZone);

  const valid = [...new Set([offsetBefore, offsetAfter])]
    .map((offset) => ({ offset, instant: new Date(wallMs - offset) }))
    .filter(({ offset, instant }) => getOffsetMs(instant, timeZone) === offset)
    .sort((first, second) => first.instant.getTime() - second.instant.getTime());

  return valid[0]?.instant ?? new Date(wallMs - offsetBefore);
}

/** Desde las 00:00 de ese día en `timeZone` hasta las 00:00 del siguiente (en un cambio de horario dura 23 o 25 horas). */
export function localDayRange(date: string, timeZone: string = DEFAULT_TIMEZONE): LocalDayRange {
  return {
    start: localToInstant(date, 0, timeZone),
    end: localToInstant(addDays(date, 1), 0, timeZone),
  };
}

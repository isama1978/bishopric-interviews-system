import { z } from "zod";
import { messages } from "@/shared/messages/messages.es";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const YEAR_END = 4;
const MONTH_START = 5;
const MONTH_END = 7;
const DAY_START = 8;
const DAY_END = 10;

/** `true` si el texto es `AAAA-MM-DD` y esa fecha existe en el calendario. */
export function isRealCalendarDate(value: string): boolean {
  if (!DATE_ONLY_PATTERN.test(value)) return false;
  const year = Number(value.slice(0, YEAR_END));
  const month = Number(value.slice(MONTH_START, MONTH_END));
  const day = Number(value.slice(DAY_START, DAY_END));
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/**
 * Fecha sin hora (`AAAA-MM-DD`), para los campos `@db.Date`
 * (`ScheduleDay.date`, `LeaderDayOverride.date`). Se mantiene como texto.
 */
export const dateOnlySchema = z
  .string({ error: messages.validation.invalidDate })
  .refine(isRealCalendarDate, { error: messages.validation.invalidDate });

/**
 * Instante ISO 8601 con zona (`Z` o `±HH:MM`), para los campos `timestamptz`
 * (`startsAt`, `endsAt`). Sin zona se rechaza: sería ambiguo. Devuelve un `Date` (UTC).
 */
export const instantSchema = z.iso
  .datetime({ offset: true, error: messages.validation.invalidInstant })
  .transform((value) => new Date(value));

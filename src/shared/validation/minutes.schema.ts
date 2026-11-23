import { z } from "zod";
import {
  FIRST_WEEKDAY,
  LAST_MINUTE_OF_DAY,
  LAST_WEEKDAY,
  MAX_INTERVIEW_MINUTES,
  MIN_INTERVIEW_MINUTES,
} from "@/shared/constants/scheduling.constants";
import { messages } from "@/shared/messages/messages.es";

const FIRST_MINUTE_OF_DAY = 0;
const minutesRangeMessage = messages.validation.minutesOutOfRange(
  MIN_INTERVIEW_MINUTES,
  MAX_INTERVIEW_MINUTES,
);

/** Minutos desde las 00:00 (19:00 = 1140). Mismo rango que los CHECK de la base. */
export const minuteOfDaySchema = z
  .int({ error: messages.validation.invalidTime })
  .min(FIRST_MINUTE_OF_DAY, { error: messages.validation.invalidTime })
  .max(LAST_MINUTE_OF_DAY, { error: messages.validation.invalidTime });

/** Día de la semana: 0 = domingo ... 6 = sábado. */
export const weekdaySchema = z
  .int({ error: messages.validation.invalidWeekday })
  .min(FIRST_WEEKDAY, { error: messages.validation.invalidWeekday })
  .max(LAST_WEEKDAY, { error: messages.validation.invalidWeekday });

/** Duración configurable de una entrevista, dentro de los límites permitidos. */
export const interviewMinutesSchema = z
  .int({ error: minutesRangeMessage })
  .min(MIN_INTERVIEW_MINUTES, { error: minutesRangeMessage })
  .max(MAX_INTERVIEW_MINUTES, { error: minutesRangeMessage });

/** Entero positivo, para topes como `maxInterviewsPerDay`. */
export const positiveIntSchema = z
  .int({ error: messages.validation.mustBePositive })
  .positive({ error: messages.validation.mustBePositive });

/**
 * Rango de una jornada. Se exponen las piezas (campos, regla y mensaje) además del
 * esquema completo porque en Zod 4 no se puede extender un objeto que ya tiene
 * `refine`: los esquemas de `SchedulePattern` y `ScheduleDay` arman el suyo con estas piezas.
 */
export const dayRangeFields = {
  startMinute: minuteOfDaySchema,
  lastStartMinute: minuteOfDaySchema,
};

export function isValidDayRange(range: { startMinute: number; lastStartMinute: number }): boolean {
  return range.lastStartMinute >= range.startMinute;
}

export const dayRangeIssue = {
  error: messages.validation.invalidDayRange,
  path: ["lastStartMinute"],
};

export const dayRangeSchema = z.object(dayRangeFields).refine(isValidDayRange, dayRangeIssue);

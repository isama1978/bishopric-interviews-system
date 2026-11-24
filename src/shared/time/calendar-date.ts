import {
  INVALID_LOCAL_DATE_MESSAGE,
  MONTH_DAY_DIGITS,
  YEAR_DIGITS,
} from "@/shared/constants/time.constants";
import { isRealCalendarDate } from "@/shared/validation";

/** Fecha de calendario sin hora ni zona (`AAAA-MM-DD`). No depende de ninguna zona horaria. */
export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

/** Lee `AAAA-MM-DD`. Lanza si el texto no es una fecha real (los datos externos se validan antes, en los bordes). */
export function parseCalendarDate(date: string): CalendarDate {
  if (!isRealCalendarDate(date)) {
    throw new Error(INVALID_LOCAL_DATE_MESSAGE);
  }
  const [year = 0, month = 0, day = 0] = date.split("-").map(Number);
  return { year, month, day };
}

export function formatCalendarDate({ year, month, day }: CalendarDate): string {
  const pad = (value: number, digits: number) => String(value).padStart(digits, "0");
  return `${pad(year, YEAR_DIGITS)}-${pad(month, MONTH_DAY_DIGITS)}-${pad(day, MONTH_DAY_DIGITS)}`;
}

/** Suma (o resta, con negativos) días a una fecha, respetando meses, años y bisiestos. */
export function addDays(date: string, days: number): string {
  const { year, month, day } = parseCalendarDate(date);
  const moved = new Date(Date.UTC(year, month - 1, day + days));
  return formatCalendarDate({
    year: moved.getUTCFullYear(),
    month: moved.getUTCMonth() + 1,
    day: moved.getUTCDate(),
  });
}

/** Día de la semana de una fecha de calendario: 0 = domingo ... 6 = sábado. */
export function weekdayOfDate(date: string): number {
  const { year, month, day } = parseCalendarDate(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

import { DEFAULT_TIMEZONE } from "@/shared/constants/scheduling.constants";
import {
  FORMATTER_LOCALE,
  INCOMPLETE_TIME_PARTS_MESSAGE,
  MILLISECONDS_PER_SECOND,
  MINUTES_PER_HOUR,
} from "@/shared/constants/time.constants";
import { formatCalendarDate, weekdayOfDate } from "./calendar-date";

/** Fecha y hora vistas desde una zona horaria. */
export interface LocalParts {
  /** `AAAA-MM-DD` en esa zona. */
  date: string;
  /** Minutos desde las 00:00 locales (19:00 = 1140). */
  minuteOfDay: number;
  /** 0 = domingo ... 6 = sábado, en esa zona. */
  weekday: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Crear un `Intl.DateTimeFormat` es caro: se reutiliza uno por zona. */
function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatters.get(timeZone);
  if (cached) return cached;
  const created = new Intl.DateTimeFormat(FORMATTER_LOCALE, {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  formatters.set(timeZone, created);
  return created;
}

function partValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  const part = parts.find((candidate) => candidate.type === type);
  if (!part) throw new Error(INCOMPLETE_TIME_PARTS_MESSAGE);
  return Number(part.value);
}

/** `true` si `Intl` reconoce el nombre de la zona (por ejemplo, `America/Argentina/Cordoba`). */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    getFormatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** Diferencia en milisegundos entre la hora de pared de esa zona y UTC en ese instante (Córdoba: -3 h). */
export function getOffsetMs(instant: Date, timeZone: string = DEFAULT_TIMEZONE): number {
  const parts = getFormatter(timeZone).formatToParts(instant);
  const wallAsUtc = Date.UTC(
    partValue(parts, "year"),
    partValue(parts, "month") - 1,
    partValue(parts, "day"),
    partValue(parts, "hour"),
    partValue(parts, "minute"),
    partValue(parts, "second"),
  );
  const wholeSeconds =
    Math.floor(instant.getTime() / MILLISECONDS_PER_SECOND) * MILLISECONDS_PER_SECOND;
  return wallAsUtc - wholeSeconds;
}

/** De un instante (UTC) a la fecha, el minuto del día y el día de la semana en `timeZone`. */
export function toLocalParts(instant: Date, timeZone: string = DEFAULT_TIMEZONE): LocalParts {
  const parts = getFormatter(timeZone).formatToParts(instant);
  const date = formatCalendarDate({
    year: partValue(parts, "year"),
    month: partValue(parts, "month"),
    day: partValue(parts, "day"),
  });
  const minuteOfDay = partValue(parts, "hour") * MINUTES_PER_HOUR + partValue(parts, "minute");
  return { date, minuteOfDay, weekday: weekdayOfDate(date) };
}

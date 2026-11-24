import { MINUTES_PER_DAY } from "./scheduling.constants";

export const INVALID_CLOCK_DATE_MESSAGE = "El reloj de pruebas necesita una fecha válida.";
export const INVALID_LOCAL_DATE_MESSAGE = "La fecha local no es válida (se espera AAAA-MM-DD).";
export const INVALID_MINUTE_OF_DAY_MESSAGE =
  "El minuto del día tiene que ser un entero de 0 a 1439.";
export const INCOMPLETE_TIME_PARTS_MESSAGE = "No se pudo leer la fecha en esa zona horaria.";

export const MINUTES_PER_HOUR = 60;
export const MILLISECONDS_PER_SECOND = 1000;
export const MILLISECONDS_PER_MINUTE = 60 * MILLISECONDS_PER_SECOND;
export const MILLISECONDS_PER_DAY = MINUTES_PER_DAY * MILLISECONDS_PER_MINUTE;

/** Idioma solo para leer los números de `Intl`; no se muestra nada con él. */
export const FORMATTER_LOCALE = "en-US";
export const YEAR_DIGITS = 4;
export const MONTH_DAY_DIGITS = 2;

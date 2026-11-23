export const DEFAULT_TIMEZONE = "America/Argentina/Cordoba";

export const DEFAULT_MINUTES_PER_INTERVIEW = 30;
export const SUGGESTED_INTERVIEW_MINUTES = [15, 20, 30] as const;
/** Límites de lo que se puede configurar como duración (el diseño permite «otra»). */
export const MIN_INTERVIEW_MINUTES = 5;
export const MAX_INTERVIEW_MINUTES = 120;

export const DEFAULT_MAX_OVERBOOKINGS_PER_DAY = 2;

export const MINUTES_PER_DAY = 24 * 60;
export const LAST_MINUTE_OF_DAY = MINUTES_PER_DAY - 1;

/** 0 = domingo ... 6 = sábado */
export const FIRST_WEEKDAY = 0;
export const LAST_WEEKDAY = 6;

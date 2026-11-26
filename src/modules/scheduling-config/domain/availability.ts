import { DEFAULT_TIMEZONE } from "@/shared/constants/scheduling.constants";
import { addDays } from "@/shared/time/calendar-date";
import { localDayRange, localToInstant } from "@/shared/time/local-time";
import { applyDailyCap, countInterviewsTowardCap, resolveDailyCap } from "./daily-cap";
import { subtractOccupiedSlots, type ExistingInterview } from "./occupied-slots";
import { resolveWorkday, type SchedulePattern, type ScheduleDay } from "./schedule";
import { ALTERNATIVE_DATES_LIMIT, ALTERNATIVE_SEARCH_DAYS } from "./schedule.constants";
import { buildSlotGrid, resolveInterviewMinutes } from "./slot-grid";

/** Ajuste de un líder para una fecha puntual (`LeaderDayOverride`). */
export interface LeaderDayOverride {
  /** `AAAA-MM-DD`. */
  date: string;
  minutesPerInterview: number | null;
  maxInterviews: number | null;
}

/** Los valores propios del líder (`Leader`); `null` = usa el valor por defecto o no tiene tope. */
export interface LeaderLimits {
  minutesPerInterview: number | null;
  maxInterviewsPerDay: number | null;
}

/**
 * Todo lo necesario para calcular los horarios de UN líder. Quien llama carga los datos del rango
 * que va a consultar: las excepciones, los ajustes y las entrevistas del líder (de cualquier día).
 */
export interface LeaderAgenda {
  patterns: readonly SchedulePattern[];
  exceptions: readonly ScheduleDay[];
  leader: LeaderLimits;
  leaderDayOverrides: readonly LeaderDayOverride[];
  /** `AppConfig.defaultMinutesPerInterview`. */
  defaultMinutes: number;
  interviews: readonly ExistingInterview[];
  timeZone?: string;
  /** Si se indica, no se ofrecen horarios que ya empezaron (los que empiezan en `now` o antes). */
  now?: Date;
}

export interface AlternativeDate {
  date: string;
  /** Minutos de inicio de los horarios libres de ese día. */
  slots: number[];
}

export interface AlternativeSearchOptions {
  maxDaysAhead?: number;
  maxResults?: number;
}

function startsAfterNow(
  date: string,
  minute: number,
  timeZone: string,
  now: Date | undefined,
): boolean {
  return now === undefined || localToInstant(date, minute, timeZone).getTime() > now.getTime();
}

function findOverride(date: string, agenda: LeaderAgenda): LeaderDayOverride | undefined {
  return agenda.leaderDayOverrides.find((candidate) => candidate.date === date);
}

/** Duración efectiva de las entrevistas del líder en esa fecha: ajuste del día, del líder o valor global. */
export function interviewMinutesForDate(date: string, agenda: LeaderAgenda): number {
  return resolveInterviewMinutes({
    dayOverride: findOverride(date, agenda)?.minutesPerInterview,
    leader: agenda.leader.minutesPerInterview,
    global: agenda.defaultMinutes,
  });
}

/**
 * Horarios libres de un líder en una fecha (`AAAA-MM-DD`): suma las reglas 6.1 a 6.5.
 * Jornada → duración efectiva → grilla → resta de las citas que ocupan agenda → tope diario.
 * Devuelve los minutos de inicio, o una lista vacía si ese día no se atiende o está lleno.
 */
export function availableSlotsForDate(date: string, agenda: LeaderAgenda): number[] {
  const timeZone = agenda.timeZone ?? DEFAULT_TIMEZONE;
  const workday = resolveWorkday(date, agenda.patterns, agenda.exceptions);
  if (workday === null) return [];

  const override = findOverride(date, agenda);
  const minutes = interviewMinutesForDate(date, agenda);
  const free = subtractOccupiedSlots(
    date,
    buildSlotGrid(workday, minutes),
    minutes,
    agenda.interviews,
    timeZone,
  );

  // El tope cuenta las entrevistas que EMPIEZAN ese día local (no ese día UTC).
  const { start, end } = localDayRange(date, timeZone);
  const sameDay = agenda.interviews.filter(
    (interview) =>
      interview.startsAt.getTime() >= start.getTime() &&
      interview.startsAt.getTime() < end.getTime(),
  );
  const cap = resolveDailyCap({
    dayOverride: override?.maxInterviews,
    leader: agenda.leader.maxInterviewsPerDay,
  });
  return applyDailyCap(free, cap, countInterviewsTowardCap(sameDay)).filter((minute) =>
    startsAfterNow(date, minute, timeZone, agenda.now),
  );
}

/**
 * Otras jornadas con lugar, cuando la de `fromDate` está llena (6.7): recorre los días siguientes
 * (sin incluir `fromDate`) y devuelve las primeras que tengan al menos un horario libre, en orden
 * de fecha. Por defecto mira hasta 60 días y devuelve 3. El llamador tiene que haber cargado las
 * excepciones, los ajustes y las entrevistas de todo ese rango.
 */
export function findAlternativeDates(
  fromDate: string,
  agenda: LeaderAgenda,
  {
    maxDaysAhead = ALTERNATIVE_SEARCH_DAYS,
    maxResults = ALTERNATIVE_DATES_LIMIT,
  }: AlternativeSearchOptions = {},
): AlternativeDate[] {
  const found: AlternativeDate[] = [];
  for (let offset = 1; offset <= maxDaysAhead && found.length < maxResults; offset += 1) {
    const date = addDays(fromDate, offset);
    const slots = availableSlotsForDate(date, agenda);
    if (slots.length > 0) found.push({ date, slots });
  }
  return found;
}

import { AGENDA_OCCUPYING_STATUSES } from "@/shared/constants/interview.constants";
import { DEFAULT_TIMEZONE, LAST_MINUTE_OF_DAY } from "@/shared/constants/scheduling.constants";
import { MILLISECONDS_PER_MINUTE } from "@/shared/constants/time.constants";
import { localDayRange, localToInstant } from "@/shared/time/local-time";
import { availableSlotsForDate, interviewMinutesForDate, type LeaderAgenda } from "./availability";
import { subtractOccupiedSlots } from "./occupied-slots";
import { resolveWorkday } from "./schedule";
import { INVALID_OVERBOOKING_LIMIT_MESSAGE } from "./schedule.constants";
import { buildSlotGrid } from "./slot-grid";

export const OVERBOOKING_DENIAL_REASONS = {
  /** Ese día no se atiende (sin regla, deshabilitado o con una jornada sin horarios). */
  NO_WORKDAY: "NO_WORKDAY",
  /** Todavía hay horarios libres: se reserva uno normal. */
  DAY_NOT_FULL: "DAY_NOT_FULL",
  /** Ya hay el máximo de sobreturnos de esa jornada. Corresponde a `OVERBOOKING_LIMIT_REACHED`. */
  LIMIT_REACHED: "LIMIT_REACHED",
  /** No queda un lugar válido a continuación (pasaría de la medianoche o ya pasó). */
  NO_TIME_LEFT: "NO_TIME_LEFT",
} as const;

export type OverbookingDenialReason =
  (typeof OVERBOOKING_DENIAL_REASONS)[keyof typeof OVERBOOKING_DENIAL_REASONS];

export type OverbookingPlan =
  | { allowed: true; startMinute: number; startsAt: Date; endsAt: Date }
  | { allowed: false; reason: OverbookingDenialReason };

function deny(reason: OverbookingDenialReason): OverbookingPlan {
  return { allowed: false, reason };
}

/**
 * Decide si se puede agregar un sobreturno a un líder en una fecha y, si se puede, en qué horario (6.8).
 *
 * - Solo si el día ya no tiene horarios libres para reservar (llenos, tope alcanzado, o los que
 *   quedaban ya pasaron si se indica `agenda.now`). Es una acción del personal: quién la hace lo
 *   comprueba el caso de uso, no esta función.
 * - Máximo `maxOverbookingsPerDay` activos por líder y jornada (las canceladas liberan su lugar).
 * - Van al final: el primero un turno después del último horario de la grilla (martes de 30
 *   minutos: 22:00), el siguiente a continuación, y así. Si se cancela uno, su lugar se reutiliza
 *   antes que avanzar. No se pasa de la medianoche ni se agenda en un horario ya pasado.
 *
 * `agenda.interviews` tiene que traer las entrevistas de ese líder, sobreturnos incluidos.
 */
export function planOverbooking(
  date: string,
  agenda: LeaderAgenda,
  maxOverbookingsPerDay: number,
): OverbookingPlan {
  if (!Number.isSafeInteger(maxOverbookingsPerDay) || maxOverbookingsPerDay < 0) {
    throw new Error(INVALID_OVERBOOKING_LIMIT_MESSAGE);
  }
  const timeZone = agenda.timeZone ?? DEFAULT_TIMEZONE;
  const workday = resolveWorkday(date, agenda.patterns, agenda.exceptions);
  const minutes = workday === null ? 0 : interviewMinutesForDate(date, agenda);
  const lastGridStart = workday === null ? undefined : buildSlotGrid(workday, minutes).at(-1);
  if (workday === null || lastGridStart === undefined)
    return deny(OVERBOOKING_DENIAL_REASONS.NO_WORKDAY);
  if (availableSlotsForDate(date, agenda).length > 0)
    return deny(OVERBOOKING_DENIAL_REASONS.DAY_NOT_FULL);

  const { start, end } = localDayRange(date, timeZone);
  const active = agenda.interviews.filter(
    (interview) =>
      interview.isOverbooking &&
      AGENDA_OCCUPYING_STATUSES.includes(interview.status) &&
      interview.startsAt.getTime() >= start.getTime() &&
      interview.startsAt.getTime() < end.getTime(),
  );
  if (active.length >= maxOverbookingsPerDay) return deny(OVERBOOKING_DENIAL_REASONS.LIMIT_REACHED);

  const positions = Array.from(
    { length: maxOverbookingsPerDay },
    (_, index) => lastGridStart + (index + 1) * minutes,
  )
    .filter((minute) => minute <= LAST_MINUTE_OF_DAY)
    .filter(
      (minute) =>
        agenda.now === undefined ||
        localToInstant(date, minute, timeZone).getTime() > agenda.now.getTime(),
    );
  // `subtractOccupiedSlots` ignora los sobreturnos a propósito (no bloquean la grilla normal);
  // acá sí hay que evitar pisar a los demás sobreturnos, así que se los pasa como ocupantes comunes.
  const asOccupants = active.map((interview) => ({ ...interview, isOverbooking: false }));
  const [startMinute] = subtractOccupiedSlots(date, positions, minutes, asOccupants, timeZone);
  if (startMinute === undefined) return deny(OVERBOOKING_DENIAL_REASONS.NO_TIME_LEFT);

  const startsAt = localToInstant(date, startMinute, timeZone);
  return {
    allowed: true,
    startMinute,
    startsAt,
    endsAt: new Date(startsAt.getTime() + minutes * MILLISECONDS_PER_MINUTE),
  };
}

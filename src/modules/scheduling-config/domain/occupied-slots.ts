import {
  AGENDA_OCCUPYING_STATUSES,
  type InterviewStatus,
} from "@/shared/constants/interview.constants";
import { DEFAULT_TIMEZONE } from "@/shared/constants/scheduling.constants";
import { MILLISECONDS_PER_MINUTE } from "@/shared/constants/time.constants";
import { localToInstant } from "@/shared/time/local-time";
import { assertValidInterviewMinutes } from "./slot-grid";

/** Lo que hace falta saber de una entrevista ya existente del líder para restar su horario. */
export interface ExistingInterview {
  startsAt: Date;
  endsAt: Date;
  status: InterviewStatus;
  isOverbooking: boolean;
}

/** Los intervalos son `[inicio, fin)`, igual que la restricción de solapamiento de la base. */
function overlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && startB < endA;
}

/**
 * Una entrevista bloquea horarios si ocupa agenda (SCHEDULED, COMPLETED, NO_SHOW). Las canceladas
 * liberan el horario y los sobreturnos no bloquean la grilla (quedan fuera de la restricción de
 * solapamiento de la base, igual que del tope diario).
 */
function blocksAgenda(interview: ExistingInterview): boolean {
  return !interview.isOverbooking && AGENDA_OCCUPYING_STATUSES.includes(interview.status);
}

/**
 * Resta de la grilla (minutos de inicio del día local `date`) los horarios que se solapan con
 * entrevistas existentes del líder (6.5). Se compara por solapamiento de intervalos y no por
 * inicio exacto: cada cita guarda su propio inicio y fin, así que sigue siendo correcto si la
 * duración se cambió después de agendar. Dos citas pegadas (una termina cuando empieza la otra)
 * no se solapan.
 *
 * `minutesPerInterview` es la duración efectiva de los horarios nuevos (6.3). Hay que pasar las
 * entrevistas de ese líder; las de otros días no afectan.
 */
export function subtractOccupiedSlots(
  date: string,
  slots: readonly number[],
  minutesPerInterview: number,
  existing: readonly ExistingInterview[],
  timeZone: string = DEFAULT_TIMEZONE,
): number[] {
  assertValidInterviewMinutes(minutesPerInterview);
  const blocking = existing.filter(blocksAgenda);
  return slots.filter((minute) => {
    const start = localToInstant(date, minute, timeZone).getTime();
    const end = start + minutesPerInterview * MILLISECONDS_PER_MINUTE;
    return !blocking.some((interview) =>
      overlaps(start, end, interview.startsAt.getTime(), interview.endsAt.getTime()),
    );
  });
}

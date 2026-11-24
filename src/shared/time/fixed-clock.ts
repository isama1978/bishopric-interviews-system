import { INVALID_CLOCK_DATE_MESSAGE } from "@/shared/constants/time.constants";
import { instantSchema } from "@/shared/validation";
import type { Clock } from "./clock";

/** Reloj de pruebas: el tiempo solo cambia cuando la prueba lo pide. */
export interface FixedClock extends Clock {
  /** Pone el reloj en otro instante. */
  set(instant: Date | string): void;
  /** Adelanta el reloj (o lo atrasa con un valor negativo). */
  advance(milliseconds: number): void;
}

function toDate(instant: Date | string): Date {
  // Con texto se exige zona horaria (`Z` o `-03:00`): una prueba no debe depender de la zona de la máquina.
  const date =
    typeof instant === "string" ? instantSchema.parse(instant) : new Date(instant.getTime());
  if (Number.isNaN(date.getTime())) {
    throw new Error(INVALID_CLOCK_DATE_MESSAGE);
  }
  return date;
}

export function createFixedClock(initial: Date | string): FixedClock {
  let current = toDate(initial);
  return {
    now: () => new Date(current.getTime()),
    set(instant) {
      current = toDate(instant);
    },
    advance(milliseconds) {
      current = new Date(current.getTime() + milliseconds);
    },
  };
}

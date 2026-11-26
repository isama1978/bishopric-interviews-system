import { describe, expect, it } from "vitest";
import { INTERVIEW_STATUSES, type InterviewStatus } from "@/shared/constants/interview.constants";
import { localToInstant } from "@/shared/time/local-time";
import { availableSlotsForDate, findAlternativeDates, type LeaderAgenda } from "./availability";
import type { ExistingInterview } from "./occupied-slots";

const MINUTE_MS = 60_000;
const TUESDAY = "2026-11-24";
const NEXT_TUESDAY = "2026-12-01";
const ALL_SLOTS = [1140, 1170, 1200, 1230, 1260, 1290];

/** Entrevista a una hora local de Córdoba. */
function at(
  date: string,
  minute: number,
  status: InterviewStatus = INTERVIEW_STATUSES.SCHEDULED,
  { duration = 30, isOverbooking = false } = {},
): ExistingInterview {
  const startsAt = localToInstant(date, minute);
  return {
    startsAt,
    endsAt: new Date(startsAt.getTime() + duration * MINUTE_MS),
    status,
    isOverbooking,
  };
}

const fullDay = (date: string) => ALL_SLOTS.map((minute) => at(date, minute));

function agenda(overrides: Partial<LeaderAgenda> = {}): LeaderAgenda {
  return {
    patterns: [{ weekday: 2, startMinute: 1140, lastStartMinute: 1290, isEnabled: true }], // martes de 19:00 a 21:30
    exceptions: [],
    leader: { minutesPerInterview: null, maxInterviewsPerDay: null },
    leaderDayOverrides: [],
    defaultMinutes: 30,
    interviews: [],
    ...overrides,
  };
}

describe("availableSlotsForDate", () => {
  it("un martes libre ofrece los 6 horarios; un día sin regla, ninguno", () => {
    expect(availableSlotsForDate(TUESDAY, agenda())).toEqual(ALL_SLOTS);
    expect(availableSlotsForDate("2026-11-25", agenda())).toEqual([]);
  });

  it("resta las citas que ocupan agenda y respeta las canceladas y los sobreturnos", () => {
    const interviews = [
      at(TUESDAY, 1170),
      at(TUESDAY, 1200, INTERVIEW_STATUSES.CANCELLED_BY_MEMBER),
      at(TUESDAY, 1230, INTERVIEW_STATUSES.SCHEDULED, { isOverbooking: true }),
    ];
    expect(availableSlotsForDate(TUESDAY, agenda({ interviews }))).toEqual([
      1140, 1200, 1230, 1260, 1290,
    ]);
  });

  it("un día con todos los horarios tomados no ofrece ninguno", () => {
    expect(availableSlotsForDate(TUESDAY, agenda({ interviews: fullDay(TUESDAY) }))).toEqual([]);
  });

  it("usa el ajuste de minutos del líder para ese día", () => {
    const leaderDayOverrides = [
      { date: NEXT_TUESDAY, minutesPerInterview: 15, maxInterviews: null },
    ];
    expect(availableSlotsForDate(NEXT_TUESDAY, agenda({ leaderDayOverrides }))).toHaveLength(11);
    expect(availableSlotsForDate(TUESDAY, agenda({ leaderDayOverrides }))).toHaveLength(6);
  });

  it("aplica el tope diario: con el tope alcanzado no ofrece nada aunque haya horarios libres", () => {
    const base = agenda({
      leader: { minutesPerInterview: null, maxInterviewsPerDay: 2 },
      interviews: [at(TUESDAY, 1140), at(TUESDAY, 1170)],
    });
    expect(availableSlotsForDate(TUESDAY, base)).toEqual([]);
    expect(
      availableSlotsForDate(TUESDAY, { ...base, interviews: [at(TUESDAY, 1140)] }),
    ).toHaveLength(5);
  });

  it("el ajuste del día manda sobre el tope del líder", () => {
    const leaderDayOverrides = [{ date: TUESDAY, minutesPerInterview: null, maxInterviews: 1 }];
    const result = availableSlotsForDate(
      TUESDAY,
      agenda({
        leader: { minutesPerInterview: null, maxInterviewsPerDay: 5 },
        leaderDayOverrides,
        interviews: [at(TUESDAY, 1140)],
      }),
    );
    expect(result).toEqual([]);
  });

  it("el tope cuenta el día local, no el día UTC: la cita de las 21:30 cae el miércoles en UTC", () => {
    const interviews = [at(TUESDAY, 1290)]; // 2026-11-25T00:30Z
    const result = availableSlotsForDate(
      TUESDAY,
      agenda({ leader: { minutesPerInterview: null, maxInterviewsPerDay: 1 }, interviews }),
    );
    expect(result).toEqual([]);
  });

  it("las entrevistas de otro día no cuentan para el tope", () => {
    const interviews = [at("2026-11-17", 1140)];
    const result = availableSlotsForDate(
      TUESDAY,
      agenda({ leader: { minutesPerInterview: null, maxInterviewsPerDay: 1 }, interviews }),
    );
    expect(result).toEqual(ALL_SLOTS);
  });

  it("con `now` no ofrece horarios que ya empezaron (el que empieza justo en `now` tampoco)", () => {
    const now = new Date("2026-11-24T23:30:00Z"); // 20:30 en Córdoba
    expect(availableSlotsForDate(TUESDAY, agenda({ now }))).toEqual([1260, 1290]);
    expect(
      availableSlotsForDate(TUESDAY, agenda({ now: new Date("2026-11-24T23:10:00Z") })),
    ).toEqual([1230, 1260, 1290]);
    expect(availableSlotsForDate(NEXT_TUESDAY, agenda({ now }))).toEqual(ALL_SLOTS);
  });
});

describe("findAlternativeDates (6.7)", () => {
  it("si el martes está lleno ofrece los 3 martes siguientes con todos sus horarios", () => {
    const full = agenda({ interviews: fullDay(TUESDAY) });
    expect(availableSlotsForDate(TUESDAY, full)).toEqual([]);
    expect(findAlternativeDates(TUESDAY, full)).toEqual([
      { date: "2026-12-01", slots: ALL_SLOTS },
      { date: "2026-12-08", slots: ALL_SLOTS },
      { date: "2026-12-15", slots: ALL_SLOTS },
    ]);
  });

  it("no incluye la fecha de partida", () => {
    expect(findAlternativeDates(TUESDAY, agenda()).map((item) => item.date)).not.toContain(TUESDAY);
  });

  it("saltea las jornadas llenas, las que tienen el tope alcanzado y las deshabilitadas", () => {
    const result = findAlternativeDates(
      TUESDAY,
      agenda({
        interviews: [...fullDay("2026-12-01"), at("2026-12-08", 1140)],
        leader: { minutesPerInterview: null, maxInterviewsPerDay: 1 },
        exceptions: [
          { date: "2026-12-15", isEnabled: false, startMinute: null, lastStartMinute: null },
        ],
      }),
    );
    expect(result.map((item) => item.date)).toEqual(["2026-12-22", "2026-12-29", "2027-01-05"]);
  });

  it("incluye una jornada extra habilitada por excepción, en orden de fecha", () => {
    const exceptions = [
      { date: "2026-11-29", isEnabled: true, startMinute: 510, lastStartMinute: 570 },
    ]; // domingo 8:30
    const result = findAlternativeDates(TUESDAY, agenda({ exceptions }));
    expect(result.map((item) => item.date)).toEqual(["2026-11-29", "2026-12-01", "2026-12-08"]);
    expect(result[0]?.slots).toEqual([510, 540, 570]);
  });

  it("respeta el máximo de resultados y de días", () => {
    expect(findAlternativeDates(TUESDAY, agenda(), { maxResults: 1 })).toHaveLength(1);
    expect(findAlternativeDates(TUESDAY, agenda(), { maxDaysAhead: 6 })).toEqual([]); // el próximo martes es a los 7 días
    expect(findAlternativeDates(TUESDAY, agenda(), { maxDaysAhead: 7 })).toHaveLength(1);
  });

  it("por defecto busca hasta 60 días: con todo lleno no devuelve nada", () => {
    const interviews = Array.from({ length: 10 }, (_, week) => {
      const date = new Date(Date.UTC(2026, 11, 1 + week * 7)).toISOString().slice(0, 10);
      return fullDay(date);
    }).flat();
    expect(findAlternativeDates(TUESDAY, agenda({ interviews }))).toEqual([]);
  });

  it("sin ninguna jornada configurada devuelve una lista vacía", () => {
    expect(findAlternativeDates(TUESDAY, agenda({ patterns: [] }))).toEqual([]);
  });

  it("con `now` anterior a las jornadas futuras no recorta sus horarios", () => {
    const now = new Date("2026-11-30T12:00:00Z");
    expect(findAlternativeDates(TUESDAY, agenda({ now }))[0]?.slots).toEqual(ALL_SLOTS);
  });

  it("lanza si la fecha de partida no es válida", () => {
    expect(() => findAlternativeDates("2026-02-30", agenda())).toThrow();
  });
});

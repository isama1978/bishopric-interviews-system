import { describe, expect, it } from "vitest";
import { INTERVIEW_STATUSES, type InterviewStatus } from "@/shared/constants/interview.constants";
import { weekdayOfDate } from "@/shared/time/calendar-date";
import { localToInstant } from "@/shared/time/local-time";
import { availableSlotsForDate, findAlternativeDates, type LeaderAgenda } from "./availability";
import type { ExistingInterview } from "./occupied-slots";
import { OVERBOOKING_DENIAL_REASONS, planOverbooking } from "./overbooking";
import type { SchedulePattern } from "./schedule";

// Escenarios completos de la agenda (6.9): fechas límite y cambios de configuración en el tiempo.
// Cada escenario encadena varias reglas; las pruebas por función están en sus propios archivos.

const MINUTE_MS = 60_000;
const TUESDAY = "2026-11-24";
const ALL_SLOTS = [1140, 1170, 1200, 1230, 1260, 1290];
const TUESDAY_RULE: SchedulePattern = {
  weekday: 2,
  startMinute: 1140,
  lastStartMinute: 1290,
  isEnabled: true,
};

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

function agenda(overrides: Partial<LeaderAgenda> = {}): LeaderAgenda {
  return {
    patterns: [TUESDAY_RULE],
    exceptions: [],
    leader: { minutesPerInterview: null, maxInterviewsPerDay: null },
    leaderDayOverrides: [],
    defaultMinutes: 30,
    interviews: [],
    ...overrides,
  };
}

const dates = (items: { date: string }[]) => items.map((item) => item.date);

describe("cambio de duración después de agendar", () => {
  const booked = [at(TUESDAY, 1140), at(TUESDAY, 1170)]; // 19:00 y 19:30, de 30 minutos

  it("pasar de 30 a 20 minutos: las citas viejas siguen bloqueando lo que pisan", () => {
    expect(availableSlotsForDate(TUESDAY, agenda({ interviews: booked }))).toEqual([
      1200, 1230, 1260, 1290,
    ]);
    const twenty = agenda({
      interviews: booked,
      leader: { minutesPerInterview: 20, maxInterviewsPerDay: null },
    });
    // 19:00, 19:20 y 19:40 pisan la franja de 19:00 a 20:00 ocupada; 20:00 en adelante queda libre
    expect(availableSlotsForDate(TUESDAY, twenty)).toEqual([1200, 1220, 1240, 1260, 1280]);
  });

  it("un ajuste de duración para una sola fecha no cambia las demás", () => {
    const leaderDayOverrides = [{ date: TUESDAY, minutesPerInterview: 15, maxInterviews: null }];
    expect(availableSlotsForDate(TUESDAY, agenda({ leaderDayOverrides }))).toHaveLength(11);
    expect(availableSlotsForDate("2026-12-01", agenda({ leaderDayOverrides }))).toHaveLength(6);
  });

  it("alargar la duración a 45 minutos: un horario nuevo no puede pisar una cita existente", () => {
    const longer = agenda({ defaultMinutes: 45, interviews: [at(TUESDAY, 1200)] }); // cita de 20:00 a 20:30
    // La grilla de a 45 minutos es 19:00, 19:45, 20:30 y 21:15; la de las 19:45 (hasta 20:30) pisa la cita
    expect(availableSlotsForDate(TUESDAY, longer)).toEqual([1140, 1230, 1275]);
  });
});

describe("cambio del tope diario con citas ya agendadas", () => {
  const booked = [at(TUESDAY, 1140), at(TUESDAY, 1170), at(TUESDAY, 1200)];

  it("bajar el tope por debajo de lo agendado no cancela nada pero no ofrece más; subirlo reabre", () => {
    const withCap = (max: number | null) =>
      agenda({
        interviews: booked,
        leader: { minutesPerInterview: null, maxInterviewsPerDay: max },
      });
    expect(availableSlotsForDate(TUESDAY, withCap(5))).toEqual([1230, 1260, 1290]);
    expect(availableSlotsForDate(TUESDAY, withCap(3))).toEqual([]);
    expect(availableSlotsForDate(TUESDAY, withCap(2))).toEqual([]);
    expect(availableSlotsForDate(TUESDAY, withCap(4))).toEqual([1230, 1260, 1290]);
    expect(availableSlotsForDate(TUESDAY, withCap(null))).toEqual([1230, 1260, 1290]);
  });

  it("un tope puntual para una fecha solo afecta a esa fecha", () => {
    const leaderDayOverrides = [{ date: TUESDAY, minutesPerInterview: null, maxInterviews: 3 }];
    expect(
      availableSlotsForDate(TUESDAY, agenda({ interviews: booked, leaderDayOverrides })),
    ).toEqual([]);
    const nextWeekBooked = [at("2026-12-01", 1140), at("2026-12-01", 1170), at("2026-12-01", 1200)];
    expect(
      availableSlotsForDate(
        "2026-12-01",
        agenda({ interviews: nextWeekBooked, leaderDayOverrides }),
      ),
    ).toHaveLength(3);
  });

  it("bajar el máximo de sobreturnos con sobreturnos existentes no cancela nada; subirlo reabre", () => {
    const full = ALL_SLOTS.map((minute) => at(TUESDAY, minute));
    const interviews = [
      ...full,
      at(TUESDAY, 1320, INTERVIEW_STATUSES.SCHEDULED, { isOverbooking: true }),
      at(TUESDAY, 1350, INTERVIEW_STATUSES.SCHEDULED, { isOverbooking: true }),
    ];
    expect(planOverbooking(TUESDAY, agenda({ interviews }), 1)).toEqual({
      allowed: false,
      reason: OVERBOOKING_DENIAL_REASONS.LIMIT_REACHED,
    });
    expect(planOverbooking(TUESDAY, agenda({ interviews }), 3)).toMatchObject({
      allowed: true,
      startMinute: 1380,
    });
  });
});

describe("cambio de las reglas semanales", () => {
  it("mover la regla del martes al miércoles: el martes deja de ofrecer y el miércoles empieza", () => {
    const tuesdayBooked = [at(TUESDAY, 1140)];
    const moved = agenda({
      patterns: [{ ...TUESDAY_RULE, weekday: 3 }],
      interviews: tuesdayBooked,
    });
    expect(availableSlotsForDate(TUESDAY, moved)).toEqual([]);
    expect(availableSlotsForDate("2026-11-25", moved)).toEqual(ALL_SLOTS);
  });

  it("extender el horario de la jornada: las citas viejas siguen bloqueando y se suman horarios nuevos", () => {
    const extended = agenda({
      patterns: [{ ...TUESDAY_RULE, startMinute: 1110, lastStartMinute: 1320 }], // 18:30 a 22:00
      interviews: [at(TUESDAY, 1140)],
    });
    expect(availableSlotsForDate(TUESDAY, extended)).toEqual([
      1110, 1170, 1200, 1230, 1260, 1290, 1320,
    ]);
  });

  it("una regla deshabilitada se puede reabrir un solo día con una excepción sin horario propio", () => {
    const base = agenda({
      patterns: [{ ...TUESDAY_RULE, isEnabled: false }],
      exceptions: [
        { date: "2026-12-08", isEnabled: true, startMinute: null, lastStartMinute: null },
      ],
    });
    expect(availableSlotsForDate(TUESDAY, base)).toEqual([]);
    expect(availableSlotsForDate("2026-12-08", base)).toEqual(ALL_SLOTS);
    expect(dates(findAlternativeDates(TUESDAY, base))).toEqual(["2026-12-08"]);
  });

  it("una jornada deshabilitada una semana y habilitada la siguiente", () => {
    const base = agenda({
      exceptions: [
        { date: "2026-12-01", isEnabled: false, startMinute: null, lastStartMinute: null },
      ],
    });
    expect(availableSlotsForDate("2026-12-01", base)).toEqual([]);
    expect(availableSlotsForDate("2026-12-08", base)).toEqual(ALL_SLOTS);
    expect(dates(findAlternativeDates(TUESDAY, base))).toEqual([
      "2026-12-08",
      "2026-12-15",
      "2026-12-22",
    ]);
  });
});

describe("cambio de zona horaria", () => {
  it("las citas guardadas no se mueven: solo cambia en qué horas locales cae la grilla", () => {
    const bookedAt1900Cordoba = [{ ...at(TUESDAY, 1140) }]; // 22:00 UTC
    expect(availableSlotsForDate(TUESDAY, agenda({ interviews: bookedAt1900Cordoba }))).toEqual([
      1170, 1200, 1230, 1260, 1290,
    ]);
    // Con la zona en UTC la grilla (19:00 a 21:30 UTC) ya no pisa esa cita de las 22:00 UTC
    expect(
      availableSlotsForDate(TUESDAY, agenda({ interviews: bookedAt1900Cordoba, timeZone: "UTC" })),
    ).toEqual(ALL_SLOTS);
  });
});

describe("fechas límite del calendario", () => {
  it("cruza el cambio de año buscando alternativas", () => {
    expect(dates(findAlternativeDates("2026-12-22", agenda()))).toEqual([
      "2026-12-29",
      "2027-01-05",
      "2027-01-12",
    ]);
  });

  it("saltea las fiestas de fin de año deshabilitadas por excepción", () => {
    const exceptions = ["2026-12-29", "2027-01-05"].map((date) => ({
      date,
      isEnabled: false,
      startMinute: null,
      lastStartMinute: null,
    }));
    expect(dates(findAlternativeDates("2026-12-22", agenda({ exceptions })))).toEqual([
      "2027-01-12",
      "2027-01-19",
      "2027-01-26",
    ]);
  });

  it("año bisiesto: existe el 29 de febrero de 2028 y no el de 2027", () => {
    const rule = (from: string): SchedulePattern => ({
      ...TUESDAY_RULE,
      weekday: weekdayOfDate(from),
    });
    const leapFrom = "2028-02-22";
    expect(dates(findAlternativeDates(leapFrom, agenda({ patterns: [rule(leapFrom)] })))).toEqual([
      "2028-02-29",
      "2028-03-07",
      "2028-03-14",
    ]);
    const commonFrom = "2027-02-22";
    expect(
      dates(findAlternativeDates(commonFrom, agenda({ patterns: [rule(commonFrom)] })))[0],
    ).toBe("2027-03-01");
    expect(() => availableSlotsForDate("2027-02-29", agenda())).toThrow();
  });

  it("el tope se cuenta bien el día bisiesto, que termina en la medianoche de marzo", () => {
    const leapDay = "2028-02-29";
    const rule: SchedulePattern = { ...TUESDAY_RULE, weekday: weekdayOfDate(leapDay) };
    const interviews = [at(leapDay, 1290)]; // 21:30 local = 00:30 UTC del 1 de marzo
    const capped = agenda({
      patterns: [rule],
      leader: { minutesPerInterview: null, maxInterviewsPerDay: 1 },
      interviews,
    });
    expect(availableSlotsForDate(leapDay, capped)).toEqual([]);
    expect(availableSlotsForDate("2028-03-07", capped)).toHaveLength(6);
  });

  it("la búsqueda incluye una jornada a exactamente 60 días y excluye la de 61", () => {
    const only = (date: string) =>
      agenda({
        patterns: [],
        exceptions: [{ date, isEnabled: true, startMinute: 600, lastStartMinute: 600 }],
      });
    expect(dates(findAlternativeDates(TUESDAY, only("2027-01-23")))).toEqual(["2027-01-23"]); // +60
    expect(findAlternativeDates(TUESDAY, only("2027-01-24"))).toEqual([]); // +61
  });

  it("horarios en los extremos del día: 00:00 y 23:59", () => {
    const midnight = agenda({
      patterns: [{ weekday: 2, startMinute: 0, lastStartMinute: 0, isEnabled: true }],
    });
    expect(availableSlotsForDate(TUESDAY, midnight)).toEqual([0]);
    const lastMinute = agenda({
      patterns: [{ weekday: 2, startMinute: 1439, lastStartMinute: 1439, isEnabled: true }],
    });
    expect(availableSlotsForDate(TUESDAY, lastMinute)).toEqual([1439]);
    expect(
      availableSlotsForDate(TUESDAY, { ...lastMinute, interviews: [at(TUESDAY, 1439)] }),
    ).toEqual([]);
  });
});

describe("recorrido completo de una jornada", () => {
  it("se llena de a un horario, pasa a sobreturnos, llega al máximo y se reabre al cancelar", () => {
    const interviews: ExistingInterview[] = [];
    const current = () => agenda({ interviews });

    for (const expectedFirst of ALL_SLOTS) {
      const free = availableSlotsForDate(TUESDAY, current());
      expect(free[0]).toBe(expectedFirst);
      interviews.push(at(TUESDAY, expectedFirst));
    }
    expect(availableSlotsForDate(TUESDAY, current())).toEqual([]);
    expect(dates(findAlternativeDates(TUESDAY, current()))).toEqual([
      "2026-12-01",
      "2026-12-08",
      "2026-12-15",
    ]);

    for (const expectedMinute of [1320, 1350, 1380]) {
      const plan = planOverbooking(TUESDAY, current(), 3);
      expect(plan).toMatchObject({ allowed: true, startMinute: expectedMinute });
      interviews.push(
        at(TUESDAY, expectedMinute, INTERVIEW_STATUSES.SCHEDULED, { isOverbooking: true }),
      );
    }
    expect(planOverbooking(TUESDAY, current(), 3)).toEqual({
      allowed: false,
      reason: OVERBOOKING_DENIAL_REASONS.LIMIT_REACHED,
    });

    // Se cancela la cita de las 20:00: el horario se reabre y los sobreturnos ya no corresponden
    interviews[2] = at(TUESDAY, 1200, INTERVIEW_STATUSES.CANCELLED_BY_MEMBER);
    expect(availableSlotsForDate(TUESDAY, current())).toEqual([1200]);
    expect(planOverbooking(TUESDAY, current(), 3)).toEqual({
      allowed: false,
      reason: OVERBOOKING_DENIAL_REASONS.DAY_NOT_FULL,
    });
  });
});

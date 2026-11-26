import { describe, expect, it } from "vitest";
import { INTERVIEW_STATUSES, type InterviewStatus } from "@/shared/constants/interview.constants";
import { localToInstant } from "@/shared/time/local-time";
import type { LeaderAgenda } from "./availability";
import type { ExistingInterview } from "./occupied-slots";
import { OVERBOOKING_DENIAL_REASONS as REASONS, planOverbooking } from "./overbooking";

const MINUTE_MS = 60_000;
const TUESDAY = "2026-11-24";
const ALL_SLOTS = [1140, 1170, 1200, 1230, 1260, 1290];
const MAX = 3;

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
const overbooking = (minute: number, status: InterviewStatus = INTERVIEW_STATUSES.SCHEDULED) =>
  at(TUESDAY, minute, status, { isOverbooking: true });

function agenda(overrides: Partial<LeaderAgenda> = {}): LeaderAgenda {
  return {
    patterns: [{ weekday: 2, startMinute: 1140, lastStartMinute: 1290, isEnabled: true }],
    exceptions: [],
    leader: { minutesPerInterview: null, maxInterviewsPerDay: null },
    leaderDayOverrides: [],
    defaultMinutes: 30,
    interviews: fullDay(TUESDAY),
    ...overrides,
  };
}

const startOf = (plan: ReturnType<typeof planOverbooking>) =>
  plan.allowed ? plan.startMinute : plan.reason;

describe("planOverbooking: cuándo se permite", () => {
  it("con el día lleno permite uno a las 22:00, con su inicio y fin en UTC", () => {
    const plan = planOverbooking(TUESDAY, agenda(), MAX);
    expect(plan).toEqual({
      allowed: true,
      startMinute: 1320,
      startsAt: new Date("2026-11-25T01:00:00Z"),
      endsAt: new Date("2026-11-25T01:30:00Z"),
    });
  });

  it("con horarios libres no se permite: se reserva uno normal", () => {
    expect(
      startOf(planOverbooking(TUESDAY, agenda({ interviews: [at(TUESDAY, 1140)] }), MAX)),
    ).toBe(REASONS.DAY_NOT_FULL);
    expect(startOf(planOverbooking(TUESDAY, agenda({ interviews: [] }), MAX))).toBe(
      REASONS.DAY_NOT_FULL,
    );
  });

  it("con el tope diario alcanzado se permite aunque queden horarios libres", () => {
    const capped = agenda({
      leader: { minutesPerInterview: null, maxInterviewsPerDay: 2 },
      interviews: [at(TUESDAY, 1140), at(TUESDAY, 1170)],
    });
    expect(startOf(planOverbooking(TUESDAY, capped, MAX))).toBe(1320);
  });

  it("no se permite en un día que no se atiende o con la jornada deshabilitada", () => {
    expect(startOf(planOverbooking("2026-11-25", agenda(), MAX))).toBe(REASONS.NO_WORKDAY);
    const closed = agenda({
      exceptions: [{ date: TUESDAY, isEnabled: false, startMinute: null, lastStartMinute: null }],
    });
    expect(startOf(planOverbooking(TUESDAY, closed, MAX))).toBe(REASONS.NO_WORKDAY);
  });
});

describe("planOverbooking: orden al final y límite", () => {
  it("los sobreturnos se agendan de a uno a continuación: 22:00, 22:30, 23:00", () => {
    const base = fullDay(TUESDAY);
    expect(
      startOf(planOverbooking(TUESDAY, agenda({ interviews: [...base, overbooking(1320)] }), MAX)),
    ).toBe(1350);
    expect(
      startOf(
        planOverbooking(
          TUESDAY,
          agenda({ interviews: [...base, overbooking(1320), overbooking(1350)] }),
          MAX,
        ),
      ),
    ).toBe(1380);
  });

  it("al llegar al máximo no se permite otro", () => {
    const interviews = [
      ...fullDay(TUESDAY),
      overbooking(1320),
      overbooking(1350),
      overbooking(1380),
    ];
    expect(startOf(planOverbooking(TUESDAY, agenda({ interviews }), MAX))).toBe(
      REASONS.LIMIT_REACHED,
    );
  });

  it("un sobreturno cancelado libera su lugar y se reutiliza antes de avanzar", () => {
    const interviews = [
      ...fullDay(TUESDAY),
      overbooking(1320, INTERVIEW_STATUSES.CANCELLED_BY_MEMBER),
      overbooking(1350),
    ];
    expect(startOf(planOverbooking(TUESDAY, agenda({ interviews }), MAX))).toBe(1320);
  });

  it("los sobreturnos realizados o con ausencia cuentan; los cancelados no", () => {
    const counted = [
      ...fullDay(TUESDAY),
      overbooking(1320, INTERVIEW_STATUSES.COMPLETED),
      overbooking(1350, INTERVIEW_STATUSES.NO_SHOW),
      overbooking(1380),
    ];
    expect(startOf(planOverbooking(TUESDAY, agenda({ interviews: counted }), MAX))).toBe(
      REASONS.LIMIT_REACHED,
    );
    const cancelled = [
      ...fullDay(TUESDAY),
      overbooking(1320, INTERVIEW_STATUSES.CANCELLED_BY_MEMBER),
      overbooking(1350, INTERVIEW_STATUSES.CANCELLED_BY_LEADER_PENDING),
      overbooking(1380, INTERVIEW_STATUSES.CANCELLED_NOTIFIED),
    ];
    expect(startOf(planOverbooking(TUESDAY, agenda({ interviews: cancelled }), MAX))).toBe(1320);
  });

  it("los sobreturnos de otro día no cuentan", () => {
    const other = [at("2026-11-17", 1320, INTERVIEW_STATUSES.SCHEDULED, { isOverbooking: true })];
    expect(
      startOf(planOverbooking(TUESDAY, agenda({ interviews: [...fullDay(TUESDAY), ...other] }), 1)),
    ).toBe(1320);
  });

  it("un máximo de cero no permite ninguno, y valores inválidos lanzan error", () => {
    expect(startOf(planOverbooking(TUESDAY, agenda(), 0))).toBe(REASONS.LIMIT_REACHED);
    for (const bad of [-1, 1.5, Number.NaN])
      expect(() => planOverbooking(TUESDAY, agenda(), bad), String(bad)).toThrow();
  });
});

describe("planOverbooking: posición según la duración y los bordes", () => {
  it("va un turno después del último INICIO de la grilla, no de lastStartMinute", () => {
    // De a 15 minutos la grilla termina a las 21:30 → el sobreturno a las 21:45
    const fifteen = agenda({
      defaultMinutes: 15,
      interviews: Array.from({ length: 11 }, (_, i) =>
        at(TUESDAY, 1140 + i * 15, INTERVIEW_STATUSES.SCHEDULED, { duration: 15 }),
      ),
    });
    expect(startOf(planOverbooking(TUESDAY, fifteen, MAX))).toBe(1305);
    // De a 40 minutos la grilla termina a las 21:00 → el sobreturno a las 21:40
    const forty = agenda({
      defaultMinutes: 40,
      interviews: [1140, 1180, 1220, 1260].map((minute) =>
        at(TUESDAY, minute, INTERVIEW_STATUSES.SCHEDULED, { duration: 40 }),
      ),
    });
    expect(startOf(planOverbooking(TUESDAY, forty, MAX))).toBe(1300);
  });

  it("no pasa de la medianoche", () => {
    const late = agenda({
      patterns: [{ weekday: 2, startMinute: 1410, lastStartMinute: 1410, isEnabled: true }], // 23:30
      interviews: [at(TUESDAY, 1410)],
    });
    expect(startOf(planOverbooking(TUESDAY, late, MAX))).toBe(REASONS.NO_TIME_LEFT);
  });

  it("acepta otra zona horaria", () => {
    const plan = planOverbooking(
      TUESDAY,
      {
        ...agenda({
          interviews: ALL_SLOTS.map((m) => ({
            ...at(TUESDAY, m),
            startsAt: new Date(Date.UTC(2026, 10, 24, 0, m)),
            endsAt: new Date(Date.UTC(2026, 10, 24, 0, m + 30)),
          })),
        }),
        timeZone: "UTC",
      },
      MAX,
    );
    expect(plan).toMatchObject({
      allowed: true,
      startMinute: 1320,
      startsAt: new Date("2026-11-24T22:00:00Z"),
    });
  });
});

describe("planOverbooking con `now`", () => {
  it("si ya pasaron todos los horarios reservables el día se considera lleno", () => {
    const now = new Date("2026-11-25T00:50:00Z"); // 21:50 en Córdoba: pasó el último horario libre
    const plan = planOverbooking(TUESDAY, agenda({ interviews: [], now }), MAX);
    expect(startOf(plan)).toBe(1320);
  });

  it("salta los lugares que ya pasaron y no agenda en el pasado", () => {
    const now = new Date("2026-11-25T01:10:00Z"); // 22:10 en Córdoba
    expect(startOf(planOverbooking(TUESDAY, agenda({ now }), MAX))).toBe(1350);
  });

  it("sin lugares futuros dentro del máximo devuelve NO_TIME_LEFT", () => {
    const now = new Date("2026-11-25T02:30:00Z"); // 23:30 en Córdoba: pasaron 22:00, 22:30 y 23:00
    expect(startOf(planOverbooking(TUESDAY, agenda({ now }), MAX))).toBe(REASONS.NO_TIME_LEFT);
  });
});

describe("planOverbooking: entradas", () => {
  it("no modifica los datos recibidos", () => {
    const frozen = agenda({
      interviews: Object.freeze(
        fullDay(TUESDAY).map((i) => Object.freeze(i)),
      ) as ExistingInterview[],
    });
    expect(() => planOverbooking(TUESDAY, frozen, MAX)).not.toThrow();
  });

  it("lanza si la fecha no es válida", () => {
    expect(() => planOverbooking("2026-02-30", agenda(), MAX)).toThrow();
  });
});

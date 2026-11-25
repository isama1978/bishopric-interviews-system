import { describe, expect, it } from "vitest";
import { INTERVIEW_STATUSES, type InterviewStatus } from "@/shared/constants/interview.constants";
import { applyDailyCap, countInterviewsTowardCap, resolveDailyCap } from "./daily-cap";
import { subtractOccupiedSlots, type ExistingInterview } from "./occupied-slots";
import { resolveWorkday } from "./schedule";
import { buildSlotGrid, resolveInterviewMinutes } from "./slot-grid";

const DATE = "2026-11-24"; // martes; 19:00 en Córdoba = 22:00 UTC
const GRID = [1140, 1170, 1200, 1230, 1260, 1290]; // 19:00 a 21:30
const MINUTE_MS = 60_000;

const interview = (
  startsAt: string,
  endsAt: string,
  status: InterviewStatus = INTERVIEW_STATUSES.SCHEDULED,
  isOverbooking = false,
): ExistingInterview => ({
  startsAt: new Date(startsAt),
  endsAt: new Date(endsAt),
  status,
  isOverbooking,
});

// 19:30 a 20:00 locales
const SECOND_SLOT = ["2026-11-24T22:30:00Z", "2026-11-24T23:00:00Z"] as const;

describe("subtractOccupiedSlots (6.5)", () => {
  it("sin entrevistas queda toda la grilla, en una lista nueva", () => {
    const result = subtractOccupiedSlots(DATE, GRID, 30, []);
    expect(result).toEqual(GRID);
    expect(result).not.toBe(GRID);
  });

  it("una entrevista programada le saca su horario a la grilla", () => {
    expect(subtractOccupiedSlots(DATE, GRID, 30, [interview(...SECOND_SLOT)])).toEqual([
      1140, 1200, 1230, 1260, 1290,
    ]);
  });

  it("programadas, realizadas y ausencias ocupan el horario", () => {
    for (const status of [
      INTERVIEW_STATUSES.SCHEDULED,
      INTERVIEW_STATUSES.COMPLETED,
      INTERVIEW_STATUSES.NO_SHOW,
    ]) {
      expect(
        subtractOccupiedSlots(DATE, GRID, 30, [interview(...SECOND_SLOT, status)]),
        status,
      ).not.toContain(1170);
    }
  });

  it("las canceladas liberan el horario, en cualquiera de sus estados", () => {
    for (const status of [
      INTERVIEW_STATUSES.CANCELLED_BY_MEMBER,
      INTERVIEW_STATUSES.CANCELLED_BY_LEADER_PENDING,
      INTERVIEW_STATUSES.CANCELLED_NOTIFIED,
    ]) {
      expect(
        subtractOccupiedSlots(DATE, GRID, 30, [interview(...SECOND_SLOT, status)]),
        status,
      ).toEqual(GRID);
    }
  });

  it("un sobreturno no bloquea la grilla", () => {
    expect(
      subtractOccupiedSlots(DATE, GRID, 30, [
        interview(...SECOND_SLOT, INTERVIEW_STATUSES.SCHEDULED, true),
      ]),
    ).toEqual(GRID);
  });

  it("dos citas pegadas no se solapan: la que termina a las 19:30 no saca el horario de las 19:30", () => {
    const result = subtractOccupiedSlots(DATE, GRID, 30, [
      interview("2026-11-24T22:00:00Z", "2026-11-24T22:30:00Z"),
    ]);
    expect(result).toEqual([1170, 1200, 1230, 1260, 1290]);
  });

  it("si la duración cambió, una cita de 20 minutos agendada antes sigue bloqueando lo que pisa", () => {
    // Cita de 19:00 a 19:20, con la duración actual de 30: solo se pisa el horario de las 19:00
    expect(
      subtractOccupiedSlots(DATE, GRID, 30, [
        interview("2026-11-24T22:00:00Z", "2026-11-24T22:20:00Z"),
      ]),
    ).toEqual([1170, 1200, 1230, 1260, 1290]);
    // Cita de 19:20 a 19:40: pisa el horario de las 19:00 y el de las 19:30
    expect(
      subtractOccupiedSlots(DATE, GRID, 30, [
        interview("2026-11-24T22:20:00Z", "2026-11-24T22:40:00Z"),
      ]),
    ).toEqual([1200, 1230, 1260, 1290]);
  });

  it("una cita más larga saca todos los horarios que cubre", () => {
    expect(
      subtractOccupiedSlots(DATE, GRID, 30, [
        interview("2026-11-24T22:00:00Z", "2026-11-24T23:00:00Z"),
      ]),
    ).toEqual([1200, 1230, 1260, 1290]);
  });

  it("la duración de los horarios nuevos también cuenta: de a 45 minutos un horario pisa al siguiente", () => {
    // Cita de 20:00 a 20:30 (23:00Z a 23:30Z); un horario de 45 min a las 19:30 termina 20:15 y la pisa
    const result = subtractOccupiedSlots(DATE, [1140, 1170, 1200], 45, [
      interview("2026-11-24T23:00:00Z", "2026-11-24T23:30:00Z"),
    ]);
    expect(result).toEqual([1140]);
  });

  it("compara en UTC: el último horario del martes (21:30) cae el miércoles a las 00:30 UTC", () => {
    const late = interview("2026-11-25T00:30:00Z", "2026-11-25T01:00:00Z");
    expect(subtractOccupiedSlots(DATE, GRID, 30, [late])).toEqual([1140, 1170, 1200, 1230, 1260]);
  });

  it("las entrevistas de otro día no afectan", () => {
    expect(
      subtractOccupiedSlots(DATE, GRID, 30, [
        interview("2026-11-17T22:30:00Z", "2026-11-17T23:00:00Z"),
      ]),
    ).toEqual(GRID);
  });

  it("acepta otra zona horaria por parámetro", () => {
    // En UTC, 19:00 locales son las 19:00Z
    const result = subtractOccupiedSlots(
      DATE,
      GRID,
      30,
      [interview("2026-11-24T19:00:00Z", "2026-11-24T19:30:00Z")],
      "UTC",
    );
    expect(result).toEqual([1170, 1200, 1230, 1260, 1290]);
  });

  it("con varias entrevistas y una lista vacía de horarios", () => {
    const several = [
      interview(...SECOND_SLOT),
      interview("2026-11-24T23:30:00Z", "2026-11-25T00:00:00Z", INTERVIEW_STATUSES.COMPLETED),
    ];
    // ocupan 19:30 (22:30Z) y 20:30 (23:30Z)
    expect(subtractOccupiedSlots(DATE, GRID, 30, several)).toEqual([1140, 1200, 1260, 1290]);
    expect(subtractOccupiedSlots(DATE, [], 30, several)).toEqual([]);
  });

  it("rechaza duraciones y fechas inválidas, y no modifica lo que recibe", () => {
    for (const bad of [0, -30, 1.5, Number.NaN])
      expect(() => subtractOccupiedSlots(DATE, GRID, bad, [])).toThrow();
    expect(() => subtractOccupiedSlots("2026-02-30", GRID, 30, [])).toThrow();
    const frozenSlots = Object.freeze([...GRID]);
    const frozenExisting = Object.freeze([Object.freeze(interview(...SECOND_SLOT))]);
    expect(() => subtractOccupiedSlots(DATE, frozenSlots, 30, frozenExisting)).not.toThrow();
  });
});

describe("horarios disponibles de punta a punta (6.1 a 6.5)", () => {
  const rule = { weekday: 2, startMinute: 1140, lastStartMinute: 1290, isEnabled: true };

  it("martes con dos citas, una cancelada y un tope de 4", () => {
    const workday = resolveWorkday(DATE, [rule], []);
    if (workday === null) throw new Error("se esperaba una jornada");
    const minutes = resolveInterviewMinutes({ dayOverride: null, leader: null, global: 30 });
    const existing = [
      interview("2026-11-24T22:00:00Z", "2026-11-24T22:30:00Z"),
      interview(
        "2026-11-24T22:30:00Z",
        "2026-11-24T23:00:00Z",
        INTERVIEW_STATUSES.CANCELLED_BY_MEMBER,
      ),
      interview("2026-11-24T23:00:00Z", "2026-11-24T23:30:00Z", INTERVIEW_STATUSES.COMPLETED),
    ];
    const cap = resolveDailyCap({ leader: 4 });
    const grid = buildSlotGrid(workday, minutes);
    const free = subtractOccupiedSlots(DATE, grid, minutes, existing);
    expect(applyDailyCap(free, cap, countInterviewsTowardCap(existing))).toEqual([
      1170, 1230, 1260, 1290,
    ]);
  });

  it("el tope alcanzado cierra el día aunque queden horarios libres", () => {
    const existing = [0, 1, 2].map((i) => {
      const start = Date.parse("2026-11-24T22:00:00Z") + i * 30 * MINUTE_MS;
      return interview(
        new Date(start).toISOString(),
        new Date(start + 30 * MINUTE_MS).toISOString(),
      );
    });
    const free = subtractOccupiedSlots(DATE, GRID, 30, existing);
    expect(free).toHaveLength(3);
    expect(applyDailyCap(free, 3, countInterviewsTowardCap(existing))).toEqual([]);
  });
});

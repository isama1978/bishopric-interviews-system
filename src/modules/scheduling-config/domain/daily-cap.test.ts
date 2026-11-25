import { describe, expect, it } from "vitest";
import { INTERVIEW_STATUSES, type InterviewStatus } from "@/shared/constants/interview.constants";
import {
  applyDailyCap,
  countInterviewsTowardCap,
  hasReachedDailyCap,
  resolveDailyCap,
  type CappableInterview,
} from "./daily-cap";

const GRID = [1140, 1170, 1200, 1230, 1260, 1290];
const interview = (status: InterviewStatus, isOverbooking = false): CappableInterview => ({
  status,
  isOverbooking,
});

describe("resolveDailyCap", () => {
  it("el ajuste del día manda sobre el del líder", () => {
    expect(resolveDailyCap({ dayOverride: 3, leader: 5 })).toBe(3);
  });

  it("sin ajuste del día usa el del líder", () => {
    expect(resolveDailyCap({ dayOverride: null, leader: 5 })).toBe(5);
    expect(resolveDailyCap({ leader: 5 })).toBe(5);
  });

  it("sin ninguno no hay tope (null)", () => {
    expect(resolveDailyCap({})).toBeNull();
    expect(resolveDailyCap({ dayOverride: null, leader: null })).toBeNull();
  });

  it("un valor inválido lanza error, y el 0 no equivale a «sin tope»", () => {
    for (const bad of [0, -1, 2.5, Number.NaN]) {
      expect(() => resolveDailyCap({ dayOverride: bad, leader: 5 }), String(bad)).toThrow();
      expect(() => resolveDailyCap({ leader: bad }), String(bad)).toThrow();
    }
  });
});

describe("countInterviewsTowardCap", () => {
  it("cuenta las que ocupan agenda: programadas, realizadas y ausencias", () => {
    const interviews = [
      interview(INTERVIEW_STATUSES.SCHEDULED),
      interview(INTERVIEW_STATUSES.COMPLETED),
      interview(INTERVIEW_STATUSES.NO_SHOW),
    ];
    expect(countInterviewsTowardCap(interviews)).toBe(3);
  });

  it("no cuenta las canceladas en ninguno de sus estados", () => {
    const interviews = [
      interview(INTERVIEW_STATUSES.CANCELLED_BY_MEMBER),
      interview(INTERVIEW_STATUSES.CANCELLED_BY_LEADER_PENDING),
      interview(INTERVIEW_STATUSES.CANCELLED_NOTIFIED),
    ];
    expect(countInterviewsTowardCap(interviews)).toBe(0);
  });

  it("no cuenta los sobreturnos", () => {
    expect(countInterviewsTowardCap([interview(INTERVIEW_STATUSES.SCHEDULED, true)])).toBe(0);
  });

  it("combina todo y funciona con una lista vacía", () => {
    expect(countInterviewsTowardCap([])).toBe(0);
    const mixed = [
      interview(INTERVIEW_STATUSES.SCHEDULED),
      interview(INTERVIEW_STATUSES.SCHEDULED),
      interview(INTERVIEW_STATUSES.CANCELLED_BY_MEMBER),
      interview(INTERVIEW_STATUSES.SCHEDULED, true),
      interview(INTERVIEW_STATUSES.NO_SHOW),
    ];
    expect(countInterviewsTowardCap(mixed)).toBe(3);
  });
});

describe("hasReachedDailyCap", () => {
  it("sin tope nunca se alcanza", () => {
    expect(hasReachedDailyCap(null, 0)).toBe(false);
    expect(hasReachedDailyCap(null, 999)).toBe(false);
  });

  it("se alcanza al llegar al tope y también si se lo superó (tope bajado después)", () => {
    expect(hasReachedDailyCap(4, 3)).toBe(false);
    expect(hasReachedDailyCap(4, 4)).toBe(true);
    expect(hasReachedDailyCap(2, 5)).toBe(true);
  });

  it("rechaza conteos o topes inválidos", () => {
    for (const bad of [-1, 1.5, Number.NaN])
      expect(() => hasReachedDailyCap(4, bad), String(bad)).toThrow();
    for (const bad of [0, -2, 2.5]) expect(() => hasReachedDailyCap(bad, 1), String(bad)).toThrow();
  });
});

describe("applyDailyCap", () => {
  it("sin tope devuelve toda la grilla, en una lista nueva", () => {
    const result = applyDailyCap(GRID, null, 10);
    expect(result).toEqual(GRID);
    expect(result).not.toBe(GRID);
  });

  it("por debajo del tope ofrece todos los horarios libres (no recorta la grilla)", () => {
    expect(applyDailyCap(GRID, 4, 3)).toEqual(GRID);
  });

  it("con el tope alcanzado no ofrece ninguno", () => {
    expect(applyDailyCap(GRID, 4, 4)).toEqual([]);
    expect(applyDailyCap(GRID, 2, 5)).toEqual([]);
  });

  it("escenario: tope de 4 con una cancelada y un sobreturno de por medio", () => {
    const day = [
      interview(INTERVIEW_STATUSES.SCHEDULED),
      interview(INTERVIEW_STATUSES.COMPLETED),
      interview(INTERVIEW_STATUSES.NO_SHOW),
      interview(INTERVIEW_STATUSES.CANCELLED_BY_MEMBER),
      interview(INTERVIEW_STATUSES.SCHEDULED, true),
    ];
    const cap = resolveDailyCap({ dayOverride: null, leader: 4 });
    expect(applyDailyCap(GRID, cap, countInterviewsTowardCap(day))).toEqual(GRID);
    day.push(interview(INTERVIEW_STATUSES.SCHEDULED));
    expect(applyDailyCap(GRID, cap, countInterviewsTowardCap(day))).toEqual([]);
  });

  it("al cancelar una entrevista el tope se libera", () => {
    const full = [1, 2, 3, 4].map(() => interview(INTERVIEW_STATUSES.SCHEDULED));
    expect(applyDailyCap(GRID, 4, countInterviewsTowardCap(full))).toEqual([]);
    full[0] = interview(INTERVIEW_STATUSES.CANCELLED_BY_MEMBER);
    expect(applyDailyCap(GRID, 4, countInterviewsTowardCap(full))).toEqual(GRID);
  });
});

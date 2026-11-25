import { describe, expect, it } from "vitest";
import { resolveWorkday, type SchedulePattern } from "./schedule";
import { buildSlotGrid, resolveInterviewMinutes } from "./slot-grid";

const TUESDAY_HOURS = { startMinute: 1140, lastStartMinute: 1290 }; // 19:00 a 21:30

describe("buildSlotGrid (6.2)", () => {
  it("el martes de 19:00 a 21:30 de a 30 minutos da 6 horarios, incluido el último", () => {
    expect(buildSlotGrid(TUESDAY_HOURS, 30)).toEqual([1140, 1170, 1200, 1230, 1260, 1290]);
  });

  it("cambia la cantidad según la duración", () => {
    expect(buildSlotGrid(TUESDAY_HOURS, 15)).toHaveLength(11);
    const twenty = buildSlotGrid(TUESDAY_HOURS, 20);
    expect(twenty).toHaveLength(8);
    expect(twenty.at(-1)).toBe(1280);
  });

  it("corta antes del último inicio cuando la duración no divide el rango", () => {
    expect(buildSlotGrid(TUESDAY_HOURS, 40)).toEqual([1140, 1180, 1220, 1260]); // 1300 > 1290
  });

  it("incluye el límite exacto y el caso de un solo horario", () => {
    expect(buildSlotGrid({ startMinute: 600, lastStartMinute: 600 }, 30)).toEqual([600]);
    expect(buildSlotGrid({ startMinute: 600, lastStartMinute: 610 }, 30)).toEqual([600]);
  });

  it("devuelve una lista vacía si el último inicio es anterior al primero", () => {
    expect(buildSlotGrid({ startMinute: 700, lastStartMinute: 600 }, 30)).toEqual([]);
  });

  it("rechaza duraciones inválidas en vez de quedarse en un ciclo infinito", () => {
    for (const bad of [0, -30, 1.5, Number.NaN, Infinity]) {
      expect(() => buildSlotGrid(TUESDAY_HOURS, bad), String(bad)).toThrow();
    }
  });

  it("no modifica la jornada recibida y devuelve una lista nueva", () => {
    const workday = Object.freeze({ ...TUESDAY_HOURS });
    expect(buildSlotGrid(workday, 30)).not.toBe(buildSlotGrid(workday, 30));
  });
});

describe("resolveInterviewMinutes (6.3)", () => {
  it("el ajuste del día manda sobre el líder y el valor global", () => {
    expect(resolveInterviewMinutes({ dayOverride: 20, leader: 15, global: 30 })).toBe(20);
  });

  it("sin ajuste del día usa el del líder", () => {
    expect(resolveInterviewMinutes({ dayOverride: null, leader: 15, global: 30 })).toBe(15);
    expect(resolveInterviewMinutes({ leader: 15, global: 30 })).toBe(15);
  });

  it("sin ajuste ni valor del líder usa el global", () => {
    expect(resolveInterviewMinutes({ dayOverride: null, leader: null, global: 30 })).toBe(30);
    expect(resolveInterviewMinutes({ global: 30 })).toBe(30);
  });

  it("un valor inválido lanza error y no se saltea (el 0 no equivale a «sin definir»)", () => {
    for (const bad of [0, -5, 12.5, Number.NaN]) {
      expect(
        () => resolveInterviewMinutes({ dayOverride: bad, leader: 15, global: 30 }),
        String(bad),
      ).toThrow();
      expect(() => resolveInterviewMinutes({ leader: bad, global: 30 }), String(bad)).toThrow();
      expect(() => resolveInterviewMinutes({ global: bad }), String(bad)).toThrow();
    }
  });
});

describe("jornada → duración → grilla", () => {
  const seedRule: SchedulePattern = {
    weekday: 2,
    startMinute: 1140,
    lastStartMinute: 1290,
    isEnabled: true,
  };

  it("el martes del seed con la duración global da la grilla de 6 horarios", () => {
    const workday = resolveWorkday("2026-11-24", [seedRule], []);
    expect(workday).not.toBeNull();
    if (workday === null) return;
    const minutes = resolveInterviewMinutes({ dayOverride: null, leader: null, global: 30 });
    expect(buildSlotGrid(workday, minutes)).toHaveLength(6);
  });

  it("un líder con 20 minutos y un ajuste de 15 para un martes puntual", () => {
    const workday = resolveWorkday("2026-11-24", [seedRule], []);
    if (workday === null) throw new Error("se esperaba una jornada");
    expect(
      buildSlotGrid(workday, resolveInterviewMinutes({ leader: 20, global: 30 })),
    ).toHaveLength(8);
    expect(
      buildSlotGrid(workday, resolveInterviewMinutes({ dayOverride: 15, leader: 20, global: 30 })),
    ).toHaveLength(11);
  });
});

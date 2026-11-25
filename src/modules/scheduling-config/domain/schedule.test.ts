import { describe, expect, it } from "vitest";
import { resolveWorkday, type SchedulePattern, type ScheduleDay } from "./schedule";

const TUESDAY = "2026-11-24";
const NEXT_TUESDAY = "2026-12-01";
const WEDNESDAY = "2026-11-25";
const SUNDAY = "2026-11-22";

// La regla que carga el seed: martes de 19:00 a 21:30
const tuesdayRule: SchedulePattern = {
  weekday: 2,
  startMinute: 1140,
  lastStartMinute: 1290,
  isEnabled: true,
};
const patterns = Object.freeze([tuesdayRule]);

const day = (
  overrides: Partial<ScheduleDay> & Pick<ScheduleDay, "date" | "isEnabled">,
): ScheduleDay => ({
  startMinute: null,
  lastStartMinute: null,
  ...overrides,
});

describe("resolveWorkday: sin excepciones", () => {
  it("usa la regla semanal del día de la semana", () => {
    expect(resolveWorkday(TUESDAY, patterns, [])).toEqual({
      date: TUESDAY,
      startMinute: 1140,
      lastStartMinute: 1290,
    });
    expect(resolveWorkday(NEXT_TUESDAY, patterns, [])).toEqual({
      date: NEXT_TUESDAY,
      startMinute: 1140,
      lastStartMinute: 1290,
    });
  });

  it("no hay jornada los días sin regla", () => {
    expect(resolveWorkday(WEDNESDAY, patterns, [])).toBeNull();
    expect(resolveWorkday(SUNDAY, patterns, [])).toBeNull();
    expect(resolveWorkday(TUESDAY, [], [])).toBeNull();
  });

  it("no hay jornada si la regla está deshabilitada", () => {
    expect(resolveWorkday(TUESDAY, [{ ...tuesdayRule, isEnabled: false }], [])).toBeNull();
  });

  it("elige la regla correcta entre varias", () => {
    const sunday: SchedulePattern = {
      weekday: 0,
      startMinute: 510,
      lastStartMinute: 600,
      isEnabled: true,
    };
    expect(resolveWorkday(SUNDAY, [tuesdayRule, sunday], [])).toEqual({
      date: SUNDAY,
      startMinute: 510,
      lastStartMinute: 600,
    });
    expect(resolveWorkday(TUESDAY, [sunday, tuesdayRule], [])?.startMinute).toBe(1140);
  });
});

describe("resolveWorkday: excepciones por fecha", () => {
  it("una excepción deshabilitada cierra el día aunque la regla esté habilitada (feriado)", () => {
    expect(
      resolveWorkday(TUESDAY, patterns, [day({ date: TUESDAY, isEnabled: false })]),
    ).toBeNull();
  });

  it("una excepción deshabilitada no afecta a otras fechas", () => {
    const exceptions = [day({ date: TUESDAY, isEnabled: false })];
    expect(resolveWorkday(NEXT_TUESDAY, patterns, exceptions)?.startMinute).toBe(1140);
  });

  it("una excepción habilitada con horario propio habilita un día sin regla (domingo 8:30)", () => {
    const exceptions = [
      day({ date: SUNDAY, isEnabled: true, startMinute: 510, lastStartMinute: 570 }),
    ];
    expect(resolveWorkday(SUNDAY, patterns, exceptions)).toEqual({
      date: SUNDAY,
      startMinute: 510,
      lastStartMinute: 570,
    });
  });

  it("el horario de la excepción reemplaza al de la regla", () => {
    const exceptions = [
      day({ date: TUESDAY, isEnabled: true, startMinute: 1080, lastStartMinute: 1200 }),
    ];
    expect(resolveWorkday(TUESDAY, patterns, exceptions)).toEqual({
      date: TUESDAY,
      startMinute: 1080,
      lastStartMinute: 1200,
    });
  });

  it("una excepción habilitada sin horario usa el de la regla semanal, incluso si la regla está deshabilitada", () => {
    const exceptions = [day({ date: TUESDAY, isEnabled: true })];
    expect(resolveWorkday(TUESDAY, patterns, exceptions)?.startMinute).toBe(1140);
    expect(resolveWorkday(TUESDAY, [{ ...tuesdayRule, isEnabled: false }], exceptions)).toEqual({
      date: TUESDAY,
      startMinute: 1140,
      lastStartMinute: 1290,
    });
  });

  it("una excepción habilitada sin horario y sin regla no tiene jornada", () => {
    expect(
      resolveWorkday(WEDNESDAY, patterns, [day({ date: WEDNESDAY, isEnabled: true })]),
    ).toBeNull();
  });

  it("acepta jornadas que cruzan la medianoche UTC sin cambiar de fecha local", () => {
    // 21:30 locales de Córdoba es 00:30 UTC del día siguiente: la jornada sigue siendo del martes
    expect(resolveWorkday(TUESDAY, patterns, [])?.date).toBe(TUESDAY);
  });
});

describe("resolveWorkday: entradas", () => {
  it("lanza si la fecha no es una fecha real", () => {
    expect(() => resolveWorkday("2026-02-30", patterns, [])).toThrow();
    expect(() => resolveWorkday("hola", patterns, [])).toThrow();
  });

  it("no modifica los datos recibidos", () => {
    const exceptions = Object.freeze([Object.freeze(day({ date: TUESDAY, isEnabled: true }))]);
    expect(() => resolveWorkday(TUESDAY, patterns, exceptions)).not.toThrow();
  });
});

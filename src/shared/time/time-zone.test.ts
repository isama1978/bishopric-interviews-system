import { describe, expect, it } from "vitest";
import { DEFAULT_TIMEZONE } from "@/shared/constants/scheduling.constants";
import { addDays, weekdayOfDate } from "./calendar-date";
import { localDayRange, localToInstant } from "./local-time";
import { getOffsetMs, isValidTimeZone, toLocalParts } from "./time-zone";

const NEW_YORK = "America/New_York";
const MINUTE_MS = 60_000;
const iso = (date: Date) => date.toISOString();

describe("de UTC a la hora local (Córdoba por defecto)", () => {
  it("la zona por defecto es Córdoba (UTC-3, sin horario de verano)", () => {
    expect(DEFAULT_TIMEZONE).toBe("America/Argentina/Cordoba");
    expect(getOffsetMs(new Date("2026-01-15T12:00:00Z"))).toBe(-3 * 60 * MINUTE_MS);
    expect(getOffsetMs(new Date("2026-07-15T12:00:00Z"))).toBe(-3 * 60 * MINUTE_MS);
  });

  it("el martes a las 19:00 locales es 22:00 UTC", () => {
    expect(toLocalParts(new Date("2026-11-24T22:00:00Z"))).toEqual({
      date: "2026-11-24",
      minuteOfDay: 1140,
      weekday: 2,
    });
  });

  it("cruza la medianoche local a las 03:00 UTC", () => {
    expect(toLocalParts(new Date("2026-11-25T02:59:59Z"))).toEqual({
      date: "2026-11-24",
      minuteOfDay: 1439,
      weekday: 2,
    });
    expect(toLocalParts(new Date("2026-11-25T03:00:00Z"))).toEqual({
      date: "2026-11-25",
      minuteOfDay: 0,
      weekday: 3,
    });
  });

  it("usa el día local, no el de UTC, para el día de la semana", () => {
    // 01:00 UTC del miércoles todavía es martes a la noche en Córdoba
    expect(toLocalParts(new Date("2026-11-25T01:00:00Z")).weekday).toBe(2);
  });

  it("funciona con la zona como parámetro, incluso con offsets de media hora", () => {
    expect(toLocalParts(new Date("2026-11-24T22:00:00Z"), "UTC").minuteOfDay).toBe(1320);
    expect(toLocalParts(new Date("2026-11-24T22:00:00Z"), "Asia/Kolkata")).toEqual({
      date: "2026-11-25",
      minuteOfDay: 210,
      weekday: 3,
    });
  });
});

describe("de la hora local a UTC", () => {
  it("convierte los horarios del martes (19:00 a 21:30) a UTC", () => {
    expect(iso(localToInstant("2026-11-24", 1140))).toBe("2026-11-24T22:00:00.000Z");
    expect(iso(localToInstant("2026-11-24", 1290))).toBe("2026-11-25T00:30:00.000Z");
  });

  it("la grilla de 30 minutos da 6 horarios con su fin en UTC", () => {
    const starts = [1140, 1170, 1200, 1230, 1260, 1290].map((minute) =>
      localToInstant("2026-11-24", minute),
    );
    expect(starts).toHaveLength(6);
    const lastEnd = new Date((starts[5] as Date).getTime() + 30 * MINUTE_MS);
    expect(iso(lastEnd)).toBe("2026-11-25T01:00:00.000Z");
  });

  it("ida y vuelta: instante → hora local → instante, durante todo un año", () => {
    const start = Date.UTC(2026, 0, 1);
    for (let step = 0; step < 24 * 365; step += 7) {
      const instant = new Date(start + step * 60 * MINUTE_MS + 13 * MINUTE_MS);
      const local = toLocalParts(instant);
      expect(iso(localToInstant(local.date, local.minuteOfDay))).toBe(iso(instant));
    }
  });

  it("acepta otras zonas por parámetro", () => {
    expect(iso(localToInstant("2026-11-24", 1140, "UTC"))).toBe("2026-11-24T19:00:00.000Z");
    expect(iso(localToInstant("2026-11-25", 210, "Asia/Kolkata"))).toBe("2026-11-24T22:00:00.000Z");
  });

  it("rechaza fechas y minutos inválidos", () => {
    expect(() => localToInstant("2026-02-30", 0)).toThrow();
    expect(() => localToInstant("hola", 0)).toThrow();
    expect(() => localToInstant("2026-11-24", 1440)).toThrow();
    expect(() => localToInstant("2026-11-24", -1)).toThrow();
    expect(() => localToInstant("2026-11-24", 10.5)).toThrow();
  });
});

describe("horario de verano (zona configurable)", () => {
  it("hora inexistente: se corre hacia adelante", () => {
    // 8 de marzo de 2026: en Nueva York el reloj pasa de 02:00 a 03:00
    expect(iso(localToInstant("2026-03-08", 2 * 60 + 30, NEW_YORK))).toBe(
      "2026-03-08T07:30:00.000Z",
    );
    expect(iso(localToInstant("2026-03-08", 60 + 30, NEW_YORK))).toBe("2026-03-08T06:30:00.000Z");
  });

  it("hora repetida: se toma la primera ocurrencia", () => {
    // 1 de noviembre de 2026: en Nueva York la 01:30 ocurre dos veces
    expect(iso(localToInstant("2026-11-01", 60 + 30, NEW_YORK))).toBe("2026-11-01T05:30:00.000Z");
    expect(iso(localToInstant("2026-11-01", 3 * 60, NEW_YORK))).toBe("2026-11-01T08:00:00.000Z");
  });

  it("el día local dura 23 o 25 horas en los cambios de horario", () => {
    const spring = localDayRange("2026-03-08", NEW_YORK);
    expect((spring.end.getTime() - spring.start.getTime()) / (60 * MINUTE_MS)).toBe(23);
    const fall = localDayRange("2026-11-01", NEW_YORK);
    expect((fall.end.getTime() - fall.start.getTime()) / (60 * MINUTE_MS)).toBe(25);
  });
});

describe("rango de un día local", () => {
  it("en Córdoba va de 03:00 UTC a 03:00 UTC del día siguiente", () => {
    const range = localDayRange("2026-11-24");
    expect(iso(range.start)).toBe("2026-11-24T03:00:00.000Z");
    expect(iso(range.end)).toBe("2026-11-25T03:00:00.000Z");
  });

  it("una entrevista del martes a la noche cae dentro del martes local aunque en UTC sea miércoles", () => {
    const range = localDayRange("2026-11-24");
    const lateSlot = localToInstant("2026-11-24", 1290);
    expect(lateSlot.getTime()).toBeGreaterThanOrEqual(range.start.getTime());
    expect(lateSlot.getTime()).toBeLessThan(range.end.getTime());
  });
});

describe("fechas de calendario", () => {
  it("addDays respeta meses, años y bisiestos", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-11-24", 7)).toBe("2026-12-01");
  });

  it("weekdayOfDate: 0 = domingo ... 6 = sábado", () => {
    expect(weekdayOfDate("2026-11-22")).toBe(0);
    expect(weekdayOfDate("2026-11-24")).toBe(2);
    expect(weekdayOfDate("2026-11-28")).toBe(6);
  });
});

describe("zonas inválidas", () => {
  it("isValidTimeZone distingue nombres reales de inventados", () => {
    expect(isValidTimeZone("America/Argentina/Cordoba")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Marte/Olympus")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });

  it("las funciones lanzan si la zona no existe", () => {
    expect(() => toLocalParts(new Date(), "Marte/Olympus")).toThrow(RangeError);
    expect(() => localToInstant("2026-11-24", 0, "Marte/Olympus")).toThrow(RangeError);
  });
});

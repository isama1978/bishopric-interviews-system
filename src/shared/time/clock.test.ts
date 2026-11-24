import { describe, expect, it } from "vitest";
import { createFixedClock } from "./fixed-clock";
import { systemClock } from "./system-clock";

const TUESDAY_EVENING = "2026-11-24T22:00:00Z";
const ONE_HOUR_MS = 60 * 60 * 1000;

describe("systemClock", () => {
  it("devuelve la hora actual y un Date nuevo en cada llamada", () => {
    const before = Date.now();
    const first = systemClock.now();
    const after = Date.now();
    expect(first.getTime()).toBeGreaterThanOrEqual(before);
    expect(first.getTime()).toBeLessThanOrEqual(after);
    expect(systemClock.now()).not.toBe(first);
  });
});

describe("createFixedClock", () => {
  it("devuelve siempre el mismo instante hasta que se cambie", () => {
    const clock = createFixedClock(TUESDAY_EVENING);
    expect(clock.now().toISOString()).toBe("2026-11-24T22:00:00.000Z");
    expect(clock.now().getTime()).toBe(clock.now().getTime());
  });

  it("acepta un Date y un texto con offset", () => {
    expect(createFixedClock(new Date(TUESDAY_EVENING)).now().toISOString()).toBe(
      "2026-11-24T22:00:00.000Z",
    );
    expect(createFixedClock("2026-11-24T19:00:00-03:00").now().toISOString()).toBe(
      "2026-11-24T22:00:00.000Z",
    );
  });

  it("modificar el Date devuelto o el recibido no cambia el reloj", () => {
    const input = new Date(TUESDAY_EVENING);
    const clock = createFixedClock(input);
    input.setFullYear(2000);
    clock.now().setFullYear(1999);
    expect(clock.now().toISOString()).toBe("2026-11-24T22:00:00.000Z");
  });

  it("set y advance mueven el reloj", () => {
    const clock = createFixedClock(TUESDAY_EVENING);
    clock.advance(ONE_HOUR_MS);
    expect(clock.now().toISOString()).toBe("2026-11-24T23:00:00.000Z");
    clock.advance(-2 * ONE_HOUR_MS);
    expect(clock.now().toISOString()).toBe("2026-11-24T21:00:00.000Z");
    clock.set("2027-01-01T00:00:00Z");
    expect(clock.now().toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("rechaza texto sin zona, fechas inválidas y valores que no son fechas", () => {
    expect(() => createFixedClock("2026-11-24T22:00:00")).toThrow();
    expect(() => createFixedClock("hola")).toThrow();
    expect(() => createFixedClock(new Date(Number.NaN))).toThrow();
    const clock = createFixedClock(TUESDAY_EVENING);
    expect(() => clock.set("2026-11-24")).toThrow();
    expect(() => clock.set(new Date(Number.NaN))).toThrow();
    expect(clock.now().toISOString()).toBe("2026-11-24T22:00:00.000Z");
  });
});

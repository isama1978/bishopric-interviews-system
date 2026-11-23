import { describe, expect, it } from "vitest";
import { messages } from "@/shared/messages/messages.es";
import {
  churchUuidSchema,
  cuidSchema,
  dateOnlySchema,
  dayRangeSchema,
  instantSchema,
  interviewMinutesSchema,
  minuteOfDaySchema,
  positiveIntSchema,
  weekdaySchema,
} from "./index";

type Parsed = { success: boolean; error?: { issues: { message: string; path: PropertyKey[] }[] } };
const firstMessage = (result: Parsed) => result.error?.issues[0]?.message;

describe("cuidSchema", () => {
  it("acepta un cuid y rechaza texto, vacío y otros tipos", () => {
    expect(cuidSchema.safeParse("cmgx7k2p10000abcd1234efgh").success).toBe(true);
    for (const bad of ["", "hola", "123", 5, null]) {
      expect(cuidSchema.safeParse(bad).success, String(bad)).toBe(false);
    }
  });

  it("usa el mensaje en español", () => {
    expect(firstMessage(cuidSchema.safeParse("x"))).toBe(messages.validation.invalidId);
  });
});

describe("churchUuidSchema", () => {
  it("acepta un uuid y lo pasa a minúsculas", () => {
    const result = churchUuidSchema.safeParse("3F2504E0-4F89-41D3-9A0C-0305E82C3301");
    expect(result.data).toBe("3f2504e0-4f89-41d3-9a0c-0305e82c3301");
  });

  it("rechaza formatos inválidos", () => {
    const bad = [
      "",
      "no-es-uuid",
      "3f2504e0-4f89-41d3-9a0c",
      " 3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    ];
    for (const value of bad) expect(churchUuidSchema.safeParse(value).success, value).toBe(false);
    expect(firstMessage(churchUuidSchema.safeParse("x"))).toBe(messages.validation.invalidUuid);
  });
});

describe("dateOnlySchema", () => {
  it("acepta fechas reales, incluido el 29 de febrero bisiesto", () => {
    for (const ok of ["2026-11-24", "2028-02-29", "2026-12-31", "2026-01-01"]) {
      expect(dateOnlySchema.safeParse(ok).data).toBe(ok);
    }
  });

  it("rechaza fechas inexistentes y formatos incorrectos", () => {
    const bad = [
      "2026-02-29",
      "2026-13-01",
      "2026-11-31",
      "2026-00-10",
      "2026-11-00",
      "26-11-24",
      "2026-1-1",
      "2026/11/24",
      "2026-11-24T10:00:00Z",
      "",
      20261124,
      null,
    ];
    for (const value of bad) {
      const result = dateOnlySchema.safeParse(value);
      expect(result.success, String(value)).toBe(false);
      expect(firstMessage(result)).toBe(messages.validation.invalidDate);
    }
  });
});

describe("instantSchema", () => {
  it("acepta Z y offsets, y devuelve el mismo instante en UTC", () => {
    expect(instantSchema.parse("2026-11-24T22:00:00Z").toISOString()).toBe(
      "2026-11-24T22:00:00.000Z",
    );
    expect(instantSchema.parse("2026-11-24T22:00:00-03:00").toISOString()).toBe(
      "2026-11-25T01:00:00.000Z",
    );
    expect(instantSchema.parse("2026-11-24T22:00:00.500+01:00").toISOString()).toBe(
      "2026-11-24T21:00:00.500Z",
    );
  });

  it("rechaza instantes sin zona, solo fecha o inexistentes", () => {
    const bad = [
      "2026-11-24T22:00:00",
      "2026-11-24",
      "hola",
      "2026-02-30T10:00:00Z",
      "2026-11-24T25:00:00Z",
      "",
    ];
    for (const value of bad) {
      const result = instantSchema.safeParse(value);
      expect(result.success, value).toBe(false);
      expect(firstMessage(result)).toBe(messages.validation.invalidInstant);
    }
  });
});

describe("minuteOfDaySchema", () => {
  it("acepta los límites 0 y 1439 y los horarios del martes", () => {
    for (const ok of [0, 1140, 1290, 1439])
      expect(minuteOfDaySchema.safeParse(ok).success).toBe(true);
  });

  it("rechaza -1, 1440, decimales, texto, NaN e infinito", () => {
    for (const bad of [-1, 1440, 1.5, "1140", Number.NaN, Infinity, null]) {
      const result = minuteOfDaySchema.safeParse(bad);
      expect(result.success, String(bad)).toBe(false);
      expect(firstMessage(result)).toBe(messages.validation.invalidTime);
    }
  });
});

describe("weekdaySchema", () => {
  it("acepta 0 a 6 y rechaza el resto", () => {
    for (const ok of [0, 2, 6]) expect(weekdaySchema.safeParse(ok).success).toBe(true);
    for (const bad of [-1, 7, 2.5, "2"]) expect(weekdaySchema.safeParse(bad).success).toBe(false);
  });
});

describe("interviewMinutesSchema y positiveIntSchema", () => {
  it("respeta los límites de duración", () => {
    for (const ok of [5, 15, 20, 30, 120])
      expect(interviewMinutesSchema.safeParse(ok).success).toBe(true);
    for (const bad of [0, 4, 121, 12.5])
      expect(interviewMinutesSchema.safeParse(bad).success).toBe(false);
  });

  it("positiveIntSchema exige enteros mayores que cero", () => {
    expect(positiveIntSchema.safeParse(1).success).toBe(true);
    for (const bad of [0, -3, 1.2]) expect(positiveIntSchema.safeParse(bad).success).toBe(false);
  });
});

describe("dayRangeSchema", () => {
  it("acepta inicio menor o igual a la última entrevista", () => {
    expect(dayRangeSchema.safeParse({ startMinute: 1140, lastStartMinute: 1290 }).success).toBe(
      true,
    );
    expect(dayRangeSchema.safeParse({ startMinute: 510, lastStartMinute: 510 }).success).toBe(true);
  });

  it("rechaza la última antes del inicio, señalando el campo", () => {
    const result = dayRangeSchema.safeParse({ startMinute: 1290, lastStartMinute: 1140 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["lastStartMinute"]);
    expect(firstMessage(result)).toBe(messages.validation.invalidDayRange);
  });

  it("rechaza minutos fuera de rango", () => {
    expect(dayRangeSchema.safeParse({ startMinute: 0, lastStartMinute: 1440 }).success).toBe(false);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { REDACTED } from "@/shared/constants/logging.constants";
import { reportUnexpectedError } from "@/shared/errors/report-unexpected-error";
import { createLogger, type LogSink } from "./logger";
import { sanitizeForLog } from "./redact";

function makeSink() {
  const calls: { level: string; args: unknown[] }[] = [];
  const sink: LogSink = {
    info: (...args) => calls.push({ level: "info", args }),
    warn: (...args) => calls.push({ level: "warn", args }),
    error: (...args) => calls.push({ level: "error", args }),
  };
  return { calls, logger: createLogger(sink) };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("logger", () => {
  it("manda cada nivel a su destino y no agrega contexto si no hay", () => {
    const { calls, logger } = makeSink();
    logger.info("a");
    logger.warn("b");
    logger.error("c");
    expect(calls).toEqual([
      { level: "info", args: ["a"] },
      { level: "warn", args: ["b"] },
      { level: "error", args: ["c"] },
    ]);
  });

  it("registra el contexto sin los campos sensibles", () => {
    const { calls, logger } = makeSink();
    logger.info("Importación terminada", {
      memberId: "cmgx7k2p10000abcd1234efgh",
      rows: 469,
      phone: "+54 9 351 555-1234",
      emailEnc: "xxxx",
      Cookie: "sid=abc",
      authorization: "Bearer abc",
      newPassword: "secreta",
      tokenHash: "ff00",
      totpSecretEnc: "yyyy",
      sessionId: "s1",
    });
    expect(calls[0]?.args[1]).toEqual({
      memberId: "cmgx7k2p10000abcd1234efgh",
      rows: 469,
      phone: REDACTED,
      emailEnc: REDACTED,
      Cookie: REDACTED,
      authorization: REDACTED,
      newPassword: REDACTED,
      tokenHash: REDACTED,
      totpSecretEnc: REDACTED,
      sessionId: REDACTED,
    });
  });

  it("también limpia objetos y listas anidados", () => {
    const { calls, logger } = makeSink();
    logger.warn("x", {
      member: { id: "m1", contact: { phone: "123", note: "ok" } },
      list: [{ email: "a@b.com", n: 1 }],
    });
    expect(calls[0]?.args[1]).toEqual({
      member: { id: "m1", contact: { phone: REDACTED, note: "ok" } },
      list: [{ email: REDACTED, n: 1 }],
    });
  });

  it("quita correos y cadenas parecidas a tokens de los textos, aunque vayan en el mensaje", () => {
    const { calls, logger } = makeSink();
    const token = "A".repeat(43);
    logger.error(`Falló para ana@example.com con ${token}`, {
      detail: `contacto juan@x.org y ${token}`,
      id: "cmgx7k2p10000abcd1234efgh",
    });
    const [message, context] = calls[0]?.args ?? [];
    expect(JSON.stringify([message, context])).not.toMatch(/@|AAAA/);
    expect((context as { id: string }).id).toBe("cmgx7k2p10000abcd1234efgh");
  });

  it("de un error registra solo el tipo y el código, no el mensaje ni la pila", () => {
    const { calls, logger } = makeSink();
    const error = Object.assign(new Error("teléfono +54 351 555-1234 duplicado"), {
      code: "P2002",
    });
    logger.error("falló", { error });
    expect(calls[0]?.args[1]).toEqual({ error: { name: "Error", code: "P2002" } });
    expect(JSON.stringify(calls)).not.toContain("555");
  });

  it("en desarrollo suma el mensaje (limpio) y la pila para depurar", () => {
    vi.stubEnv("NODE_ENV", "development");
    const described = sanitizeForLog(new Error("falló con ana@example.com")) as Record<
      string,
      string
    >;
    expect(described.message).toBe(`falló con ${REDACTED}`);
    expect(described.stack).toBeTypeOf("string");
  });

  it("soporta fechas, bigint, funciones, ciclos y getters que lanzan sin romper", () => {
    const { calls, logger } = makeSink();
    const cyclic: Record<string, unknown> = { name: "ciclo" };
    cyclic.self = cyclic;
    const throwing = {
      get boom(): string {
        throw new Error("no se puede leer");
      },
    };
    expect(() => {
      logger.info("a", { when: new Date("2026-11-24T22:00:00Z"), big: 10n, fn: () => 1, cyclic });
      logger.info("b", throwing);
    }).not.toThrow();
    const first = calls[0]?.args[1] as Record<string, unknown>;
    expect(first.when).toBe("2026-11-24T22:00:00.000Z");
    expect(first.big).toBe("10");
    expect(first.fn).toBeUndefined();
    expect(JSON.stringify(first)).toContain("Truncated");
    expect(calls[1]?.args[1]).toBe("[Unserializable]");
  });
});

describe("reportUnexpectedError con el logger", () => {
  it("fuera de desarrollo escribe solo el tipo, con el mismo texto de siempre", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    reportUnexpectedError(new TypeError("dato personal"));
    expect(spy).toHaveBeenCalledExactlyOnceWith("Error inesperado (TypeError).");
    reportUnexpectedError("texto");
    expect(spy).toHaveBeenLastCalledWith("Error inesperado (string).");
  });

  it("en desarrollo sigue mostrando el error completo", () => {
    vi.stubEnv("NODE_ENV", "development");
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = new Error("detalle");
    reportUnexpectedError(error);
    expect(spy).toHaveBeenCalledWith(error);
  });
});

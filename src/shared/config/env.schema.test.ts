import { describe, expect, it } from "vitest";
import { parseEnv } from "./env.schema";

const FAKE_SECRET = "a".repeat(44);
const FAKE_KEY = Buffer.alloc(32, 1).toString("base64");

const validSource = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  DIRECT_URL: "postgresql://user:pass@localhost:5432/db",
  APP_ENCRYPTION_KEY: FAKE_KEY,
  MEMBER_LINK_SECRET: FAKE_SECRET,
  SESSION_SECRET: FAKE_SECRET,
};

describe("parseEnv", () => {
  it("acepta un conjunto válido", () => {
    expect(parseEnv(validSource).SESSION_SECRET).toBe(FAKE_SECRET);
  });

  it("falla y nombra la variable que falta", () => {
    const incomplete = { ...validSource, SESSION_SECRET: undefined };
    expect(() => parseEnv(incomplete)).toThrow(/SESSION_SECRET/);
  });

  it("rechaza un secreto demasiado corto", () => {
    expect(() => parseEnv({ ...validSource, MEMBER_LINK_SECRET: "corto" })).toThrow(
      /MEMBER_LINK_SECRET/,
    );
  });

  it("rechaza una clave de cifrado que no mide 32 bytes", () => {
    const shortKey = Buffer.alloc(16, 1).toString("base64");
    expect(() => parseEnv({ ...validSource, APP_ENCRYPTION_KEY: shortKey })).toThrow(
      /APP_ENCRYPTION_KEY/,
    );
  });

  it("rechaza una URL que no es de PostgreSQL", () => {
    expect(() => parseEnv({ ...validSource, DATABASE_URL: "mysql://localhost/db" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("no incluye el valor del secreto en el mensaje de error", () => {
    const leaked = "valor-secreto-que-no-debe-aparecer";
    expect(() => parseEnv({ ...validSource, APP_ENCRYPTION_KEY: leaked })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining(leaked) }),
    );
  });
});

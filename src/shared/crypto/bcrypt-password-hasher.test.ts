import { describe, expect, it } from "vitest";
import { BCRYPT_MAX_PASSWORD_BYTES } from "@/shared/constants/security.constants";
import { ValidationFailedError } from "@/shared/errors/general.errors";
import { createBcryptPasswordHasher } from "./bcrypt-password-hasher";

const TEST_COST = 4; // el mínimo de bcrypt: acelera las pruebas
const hasher = createBcryptPasswordHasher(TEST_COST);
const LIMIT = "a".repeat(BCRYPT_MAX_PASSWORD_BYTES);

describe("hash de contraseñas con bcryptjs", () => {
  it("verifica la contraseña correcta y rechaza la incorrecta", async () => {
    const passwordHash = await hasher.hash("clave-segura-123");
    expect(await hasher.verify("clave-segura-123", passwordHash)).toBe(true);
    expect(await hasher.verify("clave-segura-124", passwordHash)).toBe(false);
    expect(await hasher.verify("", passwordHash)).toBe(false);
  });

  it("genera un hash bcrypt distinto cada vez (sal aleatoria) que no contiene la contraseña", async () => {
    const first = await hasher.hash("igual");
    const second = await hasher.hash("igual");
    expect(first).not.toBe(second);
    expect(first).toMatch(/^\$2[aby]\$04\$.{53}$/);
    expect(first).not.toContain("igual");
  });

  it("usa el costo por defecto (12) cuando no se indica otro", async () => {
    const passwordHash = await createBcryptPasswordHasher().hash("costo");
    expect(passwordHash.startsWith("$2b$12$") || passwordHash.startsWith("$2a$12$")).toBe(true);
  }, 20_000);

  it("acepta acentos y emojis", async () => {
    const password = "Contraseña-ñandú-😀";
    expect(await hasher.verify(password, await hasher.hash(password))).toBe(true);
  });

  it("acepta exactamente 72 bytes y rechaza más, contando bytes y no caracteres", async () => {
    await expect(hasher.hash(LIMIT)).resolves.toMatch(/^\$2/);
    await expect(hasher.hash(`${LIMIT}a`)).rejects.toBeInstanceOf(ValidationFailedError);
    await expect(hasher.hash("é".repeat(36))).resolves.toMatch(/^\$2/);
    await expect(hasher.hash("é".repeat(37))).rejects.toBeInstanceOf(ValidationFailedError);
  });

  it("el rechazo señala el campo y no incluye la contraseña", async () => {
    const password = "x".repeat(80);
    const error = await hasher.hash(password).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ValidationFailedError);
    expect((error as ValidationFailedError).fields).toEqual(["password"]);
    expect((error as Error).message).not.toContain(password);
  });

  it("verify no acepta una contraseña más larga aunque empiece igual (sin truncar)", async () => {
    const passwordHash = await hasher.hash(LIMIT);
    expect(await hasher.verify(LIMIT, passwordHash)).toBe(true);
    expect(await hasher.verify(`${LIMIT}b`, passwordHash)).toBe(false);
  });

  it("verify devuelve false, sin lanzar, con hashes inválidos", async () => {
    for (const bad of ["", "no-es-un-hash", "$2b$12$corto"]) {
      expect(await hasher.verify("cualquiera", bad), bad).toBe(false);
    }
  });
});

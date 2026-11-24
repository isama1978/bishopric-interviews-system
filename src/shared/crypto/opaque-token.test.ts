import { describe, expect, it } from "vitest";
import { generateToken, hashToken } from "./opaque-token";

describe("tokens opacos del personal", () => {
  it("genera un token apto para URL y un hash distinto de él", () => {
    const { token, tokenHash } = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).not.toContain(token);
  });

  it("el hash guardado coincide con el del token entregado", () => {
    const { token, tokenHash } = generateToken();
    expect(hashToken(token)).toBe(tokenHash);
  });

  it("no repite tokens ni hashes", () => {
    const issued = Array.from({ length: 1000 }, () => generateToken());
    expect(new Set(issued.map((item) => item.token)).size).toBe(1000);
    expect(new Set(issued.map((item) => item.tokenHash)).size).toBe(1000);
  });

  it("el hash es SHA-256 estándar y cambia si cambia un solo carácter", () => {
    expect(hashToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });
});

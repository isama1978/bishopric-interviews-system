import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  AUTH_TAG_BYTES,
  CURRENT_KEY_VERSION,
  IV_BYTES,
  KEY_VERSION_BYTES,
} from "@/shared/constants/crypto.constants";
import { ENCRYPTION_KEY_BYTES } from "@/shared/constants/env.constants";
import { createAesGcmCipher } from "./aes-gcm-cipher";
import { DecryptionFailedError } from "./decryption-failed.error";

const newKey = () => randomBytes(ENCRYPTION_KEY_BYTES).toString("base64");
const cipher = createAesGcmCipher(newKey());

function flipByte(payload: string, position: number): string {
  const bytes = Buffer.from(payload, "base64");
  bytes[position] = (bytes[position] ?? 0) ^ 0xff;
  return bytes.toString("base64");
}

describe("AES-256-GCM", () => {
  it("descifra lo que cifró, con acentos, emojis, vacío y textos largos", () => {
    for (const text of [
      "+54 9 351 555-1234",
      "mauro@example.com",
      "Ñandú Pérez",
      "😀 áéíóú",
      "",
      "x".repeat(10_000),
    ]) {
      expect(cipher.decrypt(cipher.encrypt(text))).toBe(text);
    }
  });

  it("cada cifrado del mismo texto da un resultado distinto (vector aleatorio)", () => {
    expect(cipher.encrypt("igual")).not.toBe(cipher.encrypt("igual"));
  });

  it("guarda versión + iv + tag + texto cifrado en base64 y no deja el texto a la vista", () => {
    const encrypted = cipher.encrypt("secreto");
    const bytes = Buffer.from(encrypted, "base64");
    expect(bytes[0]).toBe(CURRENT_KEY_VERSION);
    expect(bytes.length).toBe(
      KEY_VERSION_BYTES + IV_BYTES + AUTH_TAG_BYTES + Buffer.byteLength("secreto"),
    );
    expect(encrypted).not.toContain("secreto");
  });

  it("rechaza una versión de clave desconocida", () => {
    const encrypted = cipher.encrypt("dato");
    expect(() => cipher.decrypt(flipByte(encrypted, 0))).toThrow(DecryptionFailedError);
  });

  it("detecta alteraciones en el vector, en la etiqueta y en el texto cifrado", () => {
    const encrypted = cipher.encrypt("dato importante");
    const ivStart = KEY_VERSION_BYTES;
    const tagStart = ivStart + IV_BYTES;
    const dataStart = tagStart + AUTH_TAG_BYTES;
    for (const position of [ivStart, tagStart, dataStart]) {
      expect(() => cipher.decrypt(flipByte(encrypted, position))).toThrow(DecryptionFailedError);
    }
  });

  it("falla con una clave distinta", () => {
    const other = createAesGcmCipher(newKey());
    expect(() => other.decrypt(cipher.encrypt("dato"))).toThrow(DecryptionFailedError);
  });

  it("falla con datos truncados, vacíos o que no son base64 válido", () => {
    const encrypted = cipher.encrypt("dato");
    for (const bad of [
      "",
      "hola",
      encrypted.slice(0, 10),
      Buffer.alloc(KEY_VERSION_BYTES + IV_BYTES + AUTH_TAG_BYTES - 1).toString("base64"),
    ]) {
      expect(() => cipher.decrypt(bad), bad).toThrow(DecryptionFailedError);
    }
  });

  it("el mensaje de error no incluye el texto ni el contenido cifrado", () => {
    const encrypted = cipher.encrypt("telefono-privado");
    try {
      cipher.decrypt(flipByte(encrypted, KEY_VERSION_BYTES + IV_BYTES + AUTH_TAG_BYTES));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(DecryptionFailedError);
      expect((error as Error).message).not.toContain("telefono-privado");
      expect((error as Error).message).not.toContain(encrypted);
    }
  });

  it("rechaza una clave de tamaño incorrecto al crearse", () => {
    expect(() => createAesGcmCipher(randomBytes(16).toString("base64"))).toThrow();
    expect(() => createAesGcmCipher("")).toThrow();
  });
});

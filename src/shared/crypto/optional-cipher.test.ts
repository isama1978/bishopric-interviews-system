import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ENCRYPTION_KEY_BYTES } from "@/shared/constants/env.constants";
import { createAesGcmCipher } from "./aes-gcm-cipher";
import { decryptOptional, encryptOptional } from "./optional-cipher";

const cipher = createAesGcmCipher(randomBytes(ENCRYPTION_KEY_BYTES).toString("base64"));

describe("cifrado de valores opcionales", () => {
  it("deja pasar null y undefined como null", () => {
    expect(encryptOptional(cipher, null)).toBeNull();
    expect(encryptOptional(cipher, undefined)).toBeNull();
    expect(decryptOptional(cipher, null)).toBeNull();
    expect(decryptOptional(cipher, undefined)).toBeNull();
  });

  it("cifra y descifra un valor presente", () => {
    const encrypted = encryptOptional(cipher, "+54 9 351 555-1234");
    expect(encrypted).not.toBeNull();
    expect(decryptOptional(cipher, encrypted)).toBe("+54 9 351 555-1234");
  });

  it("no trata el texto vacío como ausente", () => {
    expect(decryptOptional(cipher, encryptOptional(cipher, ""))).toBe("");
  });
});

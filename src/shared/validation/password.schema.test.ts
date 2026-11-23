import { describe, expect, it } from "vitest";
import { BCRYPT_MAX_PASSWORD_BYTES } from "@/shared/constants/security.constants";
import { messages } from "@/shared/messages/messages.es";
import { isPasswordWithinByteLimit, passwordSchema } from "./password.schema";

describe("límite de la contraseña (72 bytes)", () => {
  it("cuenta bytes, no caracteres", () => {
    expect(isPasswordWithinByteLimit("a".repeat(BCRYPT_MAX_PASSWORD_BYTES))).toBe(true);
    expect(isPasswordWithinByteLimit("a".repeat(BCRYPT_MAX_PASSWORD_BYTES + 1))).toBe(false);
    expect(isPasswordWithinByteLimit("é".repeat(36))).toBe(true); // 72 bytes
    expect(isPasswordWithinByteLimit("é".repeat(37))).toBe(false); // 74 bytes
    expect(isPasswordWithinByteLimit("😀".repeat(18))).toBe(true); // 72 bytes
    expect(isPasswordWithinByteLimit("😀".repeat(19))).toBe(false); // 76 bytes
  });

  it("el esquema rechaza lo largo con el mensaje en español y lo que no es texto", () => {
    const tooLong = passwordSchema.safeParse("a".repeat(73));
    expect(tooLong.success).toBe(false);
    expect(tooLong.error?.issues[0]?.message).toBe(messages.validation.passwordTooLong);
    expect(passwordSchema.safeParse("una contraseña válida").success).toBe(true);
    expect(passwordSchema.safeParse(123).success).toBe(false);
  });
});

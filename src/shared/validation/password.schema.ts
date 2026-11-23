import { z } from "zod";
import { BCRYPT_MAX_PASSWORD_BYTES } from "@/shared/constants/security.constants";
import { messages } from "@/shared/messages/messages.es";

const textEncoder = new TextEncoder();

/** bcrypt solo mira los primeros 72 BYTES (no caracteres): una `ñ` o un emoji ocupan más de uno. */
export function isPasswordWithinByteLimit(password: string): boolean {
  return textEncoder.encode(password).length <= BCRYPT_MAX_PASSWORD_BYTES;
}

/**
 * Límite técnico de la contraseña. Todavía no incluye un largo mínimo: esa política se
 * define con la pantalla de activación (8.4) y se suma acá.
 */
export const passwordSchema = z
  .string({ error: messages.validation.required })
  .refine(isPasswordWithinByteLimit, { error: messages.validation.passwordTooLong });

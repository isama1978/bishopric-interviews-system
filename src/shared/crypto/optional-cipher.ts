import type { TextCipher } from "./text-cipher";

/**
 * Para columnas opcionales (`phoneEnc`, `emailEnc`): `null` o `undefined` pasan como `null`.
 * No decide nada más: normalizar textos vacíos (por ejemplo, no pisar un contacto con uno
 * vacío) es regla de la importación, no del cifrado.
 */
export function encryptOptional(
  cipher: TextCipher,
  value: string | null | undefined,
): string | null {
  return value == null ? null : cipher.encrypt(value);
}

export function decryptOptional(
  cipher: TextCipher,
  payload: string | null | undefined,
): string | null {
  return payload == null ? null : cipher.decrypt(payload);
}

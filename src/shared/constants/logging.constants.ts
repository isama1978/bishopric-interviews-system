export const REDACTED = "[REDACTED]";
export const TRUNCATED = "[Truncated]";
export const UNSERIALIZABLE_CONTEXT = "[Unserializable]";

/**
 * Nombres de campo cuyo valor nunca se registra: contactos, cookies, tokens, contraseñas, secretos
 * y hashes. Se busca dentro del nombre sin importar mayúsculas, así que también cubre
 * `phoneEnc`, `newPassword`, `tokenHash` o `totpSecretEnc`.
 */
export const SENSITIVE_KEY_PATTERN =
  /phone|telefono|celular|whatsapp|e-?mail|correo|cookie|token|password|contrasena|secret|authorization|totp|signature|session|hash|apikey|privatekey|encryptionkey/i;

/** Red de seguridad para textos: correos y cadenas largas que parecen tokens (43 caracteres o más). */
export const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
export const TOKEN_LIKE_PATTERN = /[A-Za-z0-9_-]{40,}/g;

export const MAX_CONTEXT_DEPTH = 5;
export const MAX_LOG_STRING_LENGTH = 500;

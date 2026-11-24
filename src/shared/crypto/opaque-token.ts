import { createHash, randomBytes } from "node:crypto";
import {
  OPAQUE_TOKEN_BYTES,
  OPAQUE_TOKEN_ENCODING,
  TOKEN_HASH_ALGORITHM,
  TOKEN_HASH_ENCODING,
} from "@/shared/constants/crypto.constants";

/** `token` se entrega a la persona (en un enlace o una cookie); `tokenHash` es lo único que se guarda. */
export interface IssuedToken {
  token: string;
  tokenHash: string;
}

/**
 * Hash de un token: SHA-256 en hexadecimal. Alcanza (no hace falta bcrypt) porque el token es
 * aleatorio de 256 bits y no se puede adivinar. Para validar, se calcula el hash del token que
 * llega y se busca por `tokenHash` (columna única) en `StaffToken` o `StaffSession`.
 */
export function hashToken(token: string): string {
  return createHash(TOKEN_HASH_ALGORITHM).update(token).digest(TOKEN_HASH_ENCODING);
}

/** Genera un token nuevo, apto para usar en una URL o una cookie, junto con su hash. */
export function generateToken(): IssuedToken {
  const token = randomBytes(OPAQUE_TOKEN_BYTES).toString(OPAQUE_TOKEN_ENCODING);
  return { token, tokenHash: hashToken(token) };
}

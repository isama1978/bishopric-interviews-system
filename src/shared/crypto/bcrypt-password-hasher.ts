import bcrypt from "bcryptjs";
import { BCRYPT_COST } from "@/shared/constants/security.constants";
import { ValidationFailedError } from "@/shared/errors/general.errors";
import { isPasswordWithinByteLimit } from "@/shared/validation";
import type { PasswordHasher } from "./password-hasher";

const PASSWORD_FIELD = "password";

async function safeCompare(password: string, passwordHash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, passwordHash);
  } catch {
    return false;
  }
}

/**
 * Hash de contraseñas con bcryptjs. bcrypt es *hashing*, no cifrado: no se puede revertir.
 * Una contraseña de más de 72 bytes se rechaza (no se trunca) para que dos contraseñas
 * distintas nunca valgan lo mismo. El costo es un parámetro solo para acelerar las pruebas.
 */
export function createBcryptPasswordHasher(cost: number = BCRYPT_COST): PasswordHasher {
  return {
    async hash(password) {
      if (!isPasswordWithinByteLimit(password)) {
        throw new ValidationFailedError([PASSWORD_FIELD]);
      }
      return bcrypt.hash(password, cost);
    },
    async verify(password, passwordHash) {
      if (!isPasswordWithinByteLimit(password)) return false;
      return safeCompare(password, passwordHash);
    },
  };
}

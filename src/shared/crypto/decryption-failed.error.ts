import { DECRYPTION_FAILED_MESSAGE } from "@/shared/constants/crypto.constants";

/**
 * Falla al descifrar. No es un `DomainError`: el usuario no puede corregirla, así que
 * se trata como error inesperado. La causa de Node no contiene el texto original.
 */
export class DecryptionFailedError extends Error {
  constructor(options?: { cause?: unknown }) {
    super(DECRYPTION_FAILED_MESSAGE, options);
    this.name = "DecryptionFailedError";
  }
}

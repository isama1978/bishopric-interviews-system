/** Puerto de cifrado de texto. Lo implementa `createAesGcmCipher`; se inyecta desde la raíz de composición. */
export interface TextCipher {
  /** Devuelve el texto cifrado listo para guardar (base64). Cada llamada da un resultado distinto. */
  encrypt(plainText: string): string;
  /** Descifra lo producido por `encrypt`. Lanza `DecryptionFailedError` si no es válido. */
  decrypt(payload: string): string;
}

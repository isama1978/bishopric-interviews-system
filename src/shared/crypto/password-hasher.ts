/** Puerto del hash de contraseñas. Lo implementa `createBcryptPasswordHasher`. */
export interface PasswordHasher {
  /** Devuelve el hash para guardar. Lanza `ValidationFailedError` si la contraseña supera el límite. */
  hash(password: string): Promise<string>;
  /** `true` solo si coincide. Una contraseña demasiado larga o un hash inválido dan `false`, nunca una excepción. */
  verify(password: string, passwordHash: string): Promise<boolean>;
}

/** Largo mínimo aceptado para un secreto (openssl rand -base64 32 genera 44). */
export const MIN_SECRET_LENGTH = 32;

/** AES-256 necesita una clave de exactamente 32 bytes. */
export const ENCRYPTION_KEY_BYTES = 32;

export const POSTGRES_URL_PATTERN = /^postgres(ql)?:\/\//;

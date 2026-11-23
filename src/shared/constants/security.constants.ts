export const BCRYPT_COST = 12;
/** bcrypt solo considera los primeros 72 bytes de la contraseña. */
export const BCRYPT_MAX_PASSWORD_BYTES = 72;

export const ACTIVATION_TOKEN_TTL_HOURS = 48;
export const PASSWORD_RESET_TOKEN_TTL_HOURS = 24;

export const SESSION_TTL_HOURS = 8;
export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MINUTES = 15;

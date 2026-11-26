/** Columnas del CSV que genera el exportador del padrón. El orden no importa: se buscan por nombre. */
export const MEMBER_CSV_COLUMNS = ["uuid", "fullName", "phone", "email"] as const;
export type MemberCsvColumn = (typeof MEMBER_CSV_COLUMNS)[number];

/** Límites de seguridad: el padrón real tiene unas 469 filas. */
export const MAX_IMPORT_ROWS = 5000;
export const MAX_NAME_LENGTH = 200;
export const MAX_PHONE_LENGTH = 40;
export const MAX_EMAIL_LENGTH = 254;

export const CSV_BOM = "\uFEFF";
export const CSV_PARSE_ERROR_MESSAGE = "El archivo no tiene un formato CSV válido.";

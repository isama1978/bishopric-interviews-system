/**
 * Cifrado simétrico autenticado.
 * Formato guardado: base64(versión de clave + iv + tag + texto cifrado).
 */
export const CIPHER_ALGORITHM = "aes-256-gcm";

/**
 * El primer byte indica con qué clave se cifró. Hoy existe una sola (versión 1). Para rotar,
 * se suma una clave nueva con la versión siguiente: lo ya guardado sigue descifrándose con
 * la anterior y se re-cifra de a poco, sin cambiar el formato.
 */
export const KEY_VERSION_BYTES = 1;
export const CURRENT_KEY_VERSION = 1;

/** 12 bytes es el tamaño recomendado de vector de inicialización para GCM. */
export const IV_BYTES = 12;
export const AUTH_TAG_BYTES = 16;

export const KEY_ENCODING = "base64";
export const PAYLOAD_ENCODING = "base64";
export const TEXT_ENCODING = "utf8";

/** Mensajes internos (para registros): nunca incluyen el texto ni la clave. */
export const DECRYPTION_FAILED_MESSAGE =
  "No se pudo descifrar el dato: está alterado, truncado o la clave no coincide.";
export const INVALID_KEY_MESSAGE = "La clave de cifrado no tiene el tamaño esperado.";

/** Enlace personal del miembro: `<memberId>.<firma>`; la firma es HMAC-SHA256 en base64url. */
export const LINK_HMAC_ALGORITHM = "sha256";
export const LINK_SIGNATURE_ENCODING = "base64url";
export const LINK_TOKEN_SEPARATOR = ".";
/** Separa este uso de la clave de cualquier otro que se le dé en el futuro. */
export const LINK_SIGNATURE_CONTEXT = "member-link";
/** Un cuid (25) más el separador y la firma (43) dan unos 70; se corta antes de procesar. */
export const MAX_LINK_TOKEN_LENGTH = 128;
export const INVALID_LINK_SECRET_MESSAGE =
  "El secreto de los enlaces personales es demasiado corto.";
export const INVALID_LINK_VERSION_MESSAGE =
  "La versión del enlace tiene que ser un entero positivo.";

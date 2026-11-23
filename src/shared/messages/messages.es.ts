import { ERROR_CODES, type ErrorCode } from "@/shared/errors/error-codes";
/**
 * Textos de la interfaz en español (voseo rioplatense).
 *
 * Es el único lugar donde se escriben los textos visibles: los componentes y las rutas
 * los toman de acá. Los mensajes nunca incluyen datos personales ni detalles internos.
 */
export const messages = {
  app: {
    name: "Agenda de entrevistas del obispado",
  },
  common: {
    save: "Guardar",
    cancel: "Cancelar",
    confirm: "Confirmar",
    close: "Cerrar",
    back: "Volver",
    loading: "Cargando…",
    retry: "Reintentar",
  },
  errors: {
    unexpected: "Ocurrió un error inesperado. Intente de nuevo en unos minutos.",
    notFound: "No encontramos lo que buscaba.",
    forbidden: "No tiene permiso para hacer esto.",
    unauthenticated: "Su sesión terminó. Inicie sesión de nuevo.",
    tooManyRequests: "Hizo demasiados intentos. Espere unos minutos y vuelva a probar.",
  },
  validation: {
    required: "Este dato es obligatorio.",
    invalidFormat: "El formato no es válido.",
    invalidDate: "La fecha no es válida.",
    invalidTime: "La hora no es válida.",
    passwordTooLong: "La contraseña es demasiado larga.",
    tooShort: (min: number) => `Tiene que tener al menos ${min} caracteres.`,
    tooLong: (max: number) => `No puede tener más de ${max} caracteres.`,
  },
} as const;

export type Messages = typeof messages;

/**
 * Texto visible para cada código de error. El tipo `Record<ErrorCode, string>` obliga a
 * que todo código nuevo tenga su mensaje: si falta uno, no compila.
 * Los textos no revelan quién tiene un horario ni ningún otro dato de terceros.
 */
export const errorMessages: Record<ErrorCode, string> = {
  [ERROR_CODES.VALIDATION_FAILED]: "Revise los datos ingresados.",
  [ERROR_CODES.NOT_AUTHENTICATED]: messages.errors.unauthenticated,
  [ERROR_CODES.FORBIDDEN]: messages.errors.forbidden,
  [ERROR_CODES.NOT_FOUND]: messages.errors.notFound,
  [ERROR_CODES.SLOT_ALREADY_TAKEN]: "Ese horario ya no está disponible. Elige otro.",
  [ERROR_CODES.MEMBER_ALREADY_BOOKED]: "Ya tiene una entrevista en ese horario.",
  [ERROR_CODES.SLOT_NOT_OFFERED]: "Ese horario no forma parte de la agenda. Elige otro.",
  [ERROR_CODES.LEADER_NOT_AVAILABLE]:
    "Esa persona no está disponible para entrevistas. Elige otra.",
  [ERROR_CODES.FORBIDDEN_LEADER_FOR_CATEGORY]:
    "Este tipo de entrevista solo la puede atender el obispo.",
  [ERROR_CODES.OVERBOOKING_LIMIT_REACHED]: "Se alcanzó el máximo de sobreturnos de este día.",
  [ERROR_CODES.SENSITIVE_NOT_REASSIGNABLE]:
    "Las entrevistas de asuntos sensibles no se pueden reasignar.",
  [ERROR_CODES.INVALID_STATUS_TRANSITION]:
    "Esa entrevista no se puede modificar en su estado actual.",
  [ERROR_CODES.STAFF_ROLE_LIMIT_REACHED]:
    "Ya se alcanzó la cantidad máxima de usuarios para ese rol.",
};

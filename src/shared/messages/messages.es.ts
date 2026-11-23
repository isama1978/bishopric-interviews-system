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

/**
 * Registro provisional de errores inesperados (la tarea 5.13 lo reemplaza por el logger).
 * Fuera de desarrollo escribe solo el tipo de error: el mensaje y la pila pueden contener
 * datos personales (por ejemplo, valores que devuelve la base).
 */
export function reportUnexpectedError(error: unknown): void {
  if (process.env.NODE_ENV === "development") {
    console.error(error);
    return;
  }
  const kind = error instanceof Error ? error.name : typeof error;
  console.error(`Error inesperado (${kind}).`);
}

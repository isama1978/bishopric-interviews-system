/**
 * Puerto del reloj. Las reglas de negocio piden la hora acá en vez de usar `new Date()` o
 * `Date.now()`, así las pruebas pueden fijar «ahora» (por ejemplo, para el plazo de
 * cancelación o la activación de enlaces).
 */
export interface Clock {
  /** El instante actual. Cada llamada devuelve un `Date` nuevo que se puede modificar sin efectos. */
  now(): Date;
}

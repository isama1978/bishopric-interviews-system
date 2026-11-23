/** 0 = domingo ... 6 = sábado */
const TUESDAY = 2;
const MINUTES_PER_HOUR = 60;

export const DEFAULT_SCHEDULE_PATTERN = {
  weekday: TUESDAY,
  startMinute: 19 * MINUTES_PER_HOUR, // 19:00 = 1140
  lastStartMinute: 21 * MINUTES_PER_HOUR + 30, // 21:30 = 1290
} as const;

/** El orden de esta lista define el orden en el formulario. */
export const DEFAULT_CATEGORIES = [
  { name: "Llamamiento", isSensitive: false },
  { name: "Ayuda económica", isSensitive: false },
  { name: "Asuntos familiares", isSensitive: false },
  { name: "Declaración de donativos", isSensitive: false },
  { name: "Recomendación para el templo", isSensitive: false },
  { name: "Asuntos sensibles", isSensitive: true },
  { name: "Otros", isSensitive: false },
] as const;

export const INITIAL_SECRETARY = {
  username: "secretario",
  displayName: "Secretario",
} as const;

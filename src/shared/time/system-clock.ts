import type { Clock } from "./clock";

/** Reloj real, para producción. Se conecta en `composition-root.ts`. */
export const systemClock: Clock = {
  now: () => new Date(),
};

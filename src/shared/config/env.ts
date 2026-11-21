import { parseEnv, type Env } from "./env.schema";

let cached: Env | undefined;

/** Devuelve las variables validadas; valida solo la primera vez. */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}

import { z } from "zod";
import {
  ENCRYPTION_KEY_BYTES,
  MIN_SECRET_LENGTH,
  POSTGRES_URL_PATTERN,
} from "@/shared/constants/env.constants";

function isValidEncryptionKey(value: string): boolean {
  return Buffer.from(value, "base64").length === ENCRYPTION_KEY_BYTES;
}

const postgresUrl = z.string().regex(POSTGRES_URL_PATTERN, "debe ser una URL de PostgreSQL");

const secret = z
  .string()
  .min(MIN_SECRET_LENGTH, `debe tener al menos ${MIN_SECRET_LENGTH} caracteres`);

const encryptionKey = z
  .string()
  .refine(isValidEncryptionKey, `debe ser base64 de ${ENCRYPTION_KEY_BYTES} bytes`);

export const envSchema = z.object({
  DATABASE_URL: postgresUrl,
  DIRECT_URL: postgresUrl,
  APP_ENCRYPTION_KEY: encryptionKey,
  MEMBER_LINK_SECRET: secret,
  SESSION_SECRET: secret,
});

export type Env = z.infer<typeof envSchema>;

function formatEnvError(error: z.ZodError): string {
  const lines = error.issues.map((issue) => `- ${issue.path.join(".")}: ${issue.message}`);
  return ["Variables de entorno inválidas o faltantes:", ...lines].join("\n");
}

/** Valida un objeto de variables. El mensaje de error nombra la variable, nunca su valor. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(formatEnvError(result.error));
  }
  return result.data;
}

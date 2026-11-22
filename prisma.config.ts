import { existsSync } from "node:fs";
import { defineConfig, env } from "prisma/config";

// El CLI de Prisma no lee .env.local por su cuenta (eso lo hace solo Next).
const ENV_FILE = ".env.local";
if (existsSync(ENV_FILE)) {
  process.loadEnvFile(ENV_FILE);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Migraciones: conexión directa, nunca el pooler.
  datasource: { url: env("DIRECT_URL") },
});

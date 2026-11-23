import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getEnv } from "@/shared/config/env";
import { DB_POOL_MAX_CONNECTIONS } from "@/shared/constants/database.constants";

// En desarrollo, Next recarga los módulos y crearía un cliente (y un pool) por cada recarga.
const globalHolder = globalThis as typeof globalThis & { prismaClient?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: getEnv().DATABASE_URL,
    max: DB_POOL_MAX_CONNECTIONS,
  });
  return new PrismaClient({ adapter });
}

/** Devuelve siempre la misma instancia; se crea la primera vez que se pide. */
export function getPrisma(): PrismaClient {
  globalHolder.prismaClient ??= createPrismaClient();
  return globalHolder.prismaClient;
}

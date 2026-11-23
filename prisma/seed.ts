import type { PrismaClient } from "@/generated/prisma/client";
import { getPrisma } from "@/shared/database/prisma";
import { DEFAULT_CATEGORIES, DEFAULT_SCHEDULE_PATTERN, INITIAL_SECRETARY } from "./seed-data";

const APP_CONFIG_ID = 1;

async function seedAppConfig(prisma: PrismaClient): Promise<void> {
  // Los valores por defecto vienen del esquema; update vacío para no pisar cambios.
  await prisma.appConfig.upsert({
    where: { id: APP_CONFIG_ID },
    create: { id: APP_CONFIG_ID },
    update: {},
  });
}

async function seedCategories(prisma: PrismaClient): Promise<void> {
  for (const [index, category] of DEFAULT_CATEGORIES.entries()) {
    await prisma.interviewCategory.upsert({
      where: { name: category.name },
      create: { name: category.name, isSensitive: category.isSensitive, sortOrder: index },
      update: {},
    });
  }
}

async function seedSchedulePattern(prisma: PrismaClient): Promise<void> {
  await prisma.schedulePattern.upsert({
    where: { weekday: DEFAULT_SCHEDULE_PATTERN.weekday },
    create: { ...DEFAULT_SCHEDULE_PATTERN, isEnabled: true },
    update: {},
  });
}

async function seedSecretary(prisma: PrismaClient): Promise<void> {
  // Solo puede haber un secretario activo: se crea únicamente si no hay ninguno,
  // aunque más adelante se haya cambiado el nombre de usuario.
  const existing = await prisma.staffUser.findFirst({
    where: { role: "SECRETARY", isActive: true },
    select: { id: true },
  });
  if (existing) return;

  await prisma.staffUser.create({
    data: {
      username: INITIAL_SECRETARY.username,
      displayName: INITIAL_SECRETARY.displayName,
      role: "SECRETARY",
      // Sin contraseña: queda pendiente de activación.
    },
  });
}

async function main(): Promise<void> {
  const prisma = getPrisma();
  try {
    await seedAppConfig(prisma);
    await seedCategories(prisma);
    await seedSchedulePattern(prisma);
    await seedSecretary(prisma);
    console.log("Seed completado.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Seed fallido:", error);
  process.exitCode = 1;
});

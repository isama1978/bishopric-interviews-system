import { getEnv } from "@/shared/config/env";
import { getPrisma } from "@/shared/database/prisma";
import { DEFAULT_SCHEDULE_PATTERN } from "./seed-data";
import {
  ARGENTINA_UTC_OFFSET_MINUTES,
  DEV_INTERVIEW_MINUTES,
  DEV_INTERVIEWS,
  DEV_MEMBER_COUNT,
  DEV_STAFF,
  devMemberName,
  devMemberUuid,
  type DevLeaderKey,
} from "./seed-dev-data";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
const DAYS_PER_WEEK = 7;
const MS_PER_MINUTE = 60_000;

function assertLocalDatabase(): void {
  const { hostname } = new URL(getEnv().DATABASE_URL);
  if (!LOCAL_HOSTS.includes(hostname)) {
    throw new Error("seed-dev solo se ejecuta contra una base local.");
  }
}

function normalizeForSearch(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Próximo día de la semana (estrictamente futuro), a las 00:00 UTC. */
function nextWeekdayUtc(weekday: number): Date {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daysAhead = (weekday - now.getUTCDay() + DAYS_PER_WEEK) % DAYS_PER_WEEK || DAYS_PER_WEEK;
  return new Date(today + daysAhead * 24 * 60 * MS_PER_MINUTE);
}

function startOf(weekOffset: number, startMinute: number): Date {
  const base = nextWeekdayUtc(DEFAULT_SCHEDULE_PATTERN.weekday).getTime();
  const weekMs = DAYS_PER_WEEK * 24 * 60 * MS_PER_MINUTE;
  return new Date(
    base + weekOffset * weekMs + (startMinute + ARGENTINA_UTC_OFFSET_MINUTES) * MS_PER_MINUTE,
  );
}

async function seedStaffAndLeaders(prisma: PrismaClient): Promise<Map<DevLeaderKey, string>> {
  const leaderIds = new Map<DevLeaderKey, string>();
  for (const staff of DEV_STAFF) {
    const user = await prisma.staffUser.upsert({
      where: { username: staff.username },
      create: { username: staff.username, displayName: staff.displayName, role: staff.role },
      update: {},
    });
    const leader = await prisma.leader.upsert({
      where: { staffUserId: user.id },
      create: { staffUserId: user.id, sortOrder: staff.sortOrder },
      update: {},
    });
    leaderIds.set(staff.key, leader.id);
  }
  return leaderIds;
}

async function seedMembers(prisma: PrismaClient): Promise<string[]> {
  const memberIds: string[] = [];
  for (let index = 0; index < DEV_MEMBER_COUNT; index++) {
    const fullName = devMemberName(index);
    const member = await prisma.member.upsert({
      where: { churchUuid: devMemberUuid(index) },
      create: {
        churchUuid: devMemberUuid(index),
        fullName,
        fullNameSearch: normalizeForSearch(fullName),
      },
      update: {},
    });
    memberIds.push(member.id);
  }
  return memberIds;
}

async function createEventIfMissing(
  prisma: PrismaClient,
  data: Prisma.InterviewEventUncheckedCreateInput,
): Promise<void> {
  const existing = await prisma.interviewEvent.findUnique({
    where: { id: data.id },
    select: { id: true },
  });
  if (!existing) {
    await prisma.interviewEvent.create({ data });
  }
}

async function seedInterviews(
  prisma: PrismaClient,
  leaderIds: Map<DevLeaderKey, string>,
  memberIds: string[],
): Promise<void> {
  const common = await prisma.interviewCategory.findFirstOrThrow({
    where: { isSensitive: false },
    orderBy: { sortOrder: "asc" },
  });
  const sensitive = await prisma.interviewCategory.findFirstOrThrow({
    where: { isSensitive: true },
  });

  for (const spec of DEV_INTERVIEWS) {
    const leaderId = leaderIds.get(spec.leader);
    const memberId = memberIds[spec.member];
    if (!leaderId || !memberId) throw new Error(`Datos de prueba incompletos: ${spec.id}`);

    const startsAt = startOf(spec.weekOffset, spec.startMinute);
    const endsAt = new Date(startsAt.getTime() + DEV_INTERVIEW_MINUTES * MS_PER_MINUTE);
    await prisma.interview.upsert({
      where: { id: spec.id },
      create: {
        id: spec.id,
        memberId,
        leaderId,
        categoryId: spec.sensitive ? sensitive.id : common.id,
        startsAt,
        endsAt,
        status: spec.status,
      },
      update: {},
    });

    const events: Prisma.InterviewEventUncheckedCreateInput[] = [
      { id: `${spec.id}_created`, interviewId: spec.id, type: "CREATED" },
    ];
    if (spec.status === "CANCELLED_BY_MEMBER") {
      events.push({
        id: `${spec.id}_cancelled`,
        interviewId: spec.id,
        type: "CANCELLED_BY_MEMBER",
      });
    }
    if (spec.status === "COMPLETED") {
      events.push({ id: `${spec.id}_completed`, interviewId: spec.id, type: "COMPLETED" });
    }
    for (const event of events) {
      await createEventIfMissing(prisma, event);
    }
  }
}

async function main(): Promise<void> {
  assertLocalDatabase();
  const prisma = getPrisma();
  try {
    const leaderIds = await seedStaffAndLeaders(prisma);
    const memberIds = await seedMembers(prisma);
    await seedInterviews(prisma, leaderIds, memberIds);
    console.log("Datos de prueba cargados.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Seed de desarrollo fallido:", error);
  process.exitCode = 1;
});

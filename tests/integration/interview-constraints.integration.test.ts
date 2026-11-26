import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Prisma } from "@/generated/prisma/client";
import {
  subtractOccupiedSlots,
  type ExistingInterview,
} from "@/modules/scheduling-config/domain/occupied-slots";
import { INTERVIEW_STATUSES, type InterviewStatus } from "@/shared/constants/interview.constants";
import { STAFF_ROLES } from "@/shared/constants/roles.constants";
import { getPrisma } from "@/shared/database/prisma";
import { localToInstant } from "@/shared/time/local-time";

/**
 * Pruebas de integración contra PostgreSQL real (6.10): comprueban que las restricciones de
 * `prisma/sql/001_constraints.sql` hacen lo que el dominio da por hecho. Requieren la base
 * levantada y migrada: `docker compose up -d` y `npm run db:migrate`.
 *
 * Usan datos propios (líderes con rol COUNSELOR, miembros y categoría nuevos por corrida) y los
 * borran al terminar, así que no tocan datos reales. Se niegan a correr si la base no es local.
 */

const prisma = getPrisma();
const RUN = randomUUID().slice(0, 8);
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1", "[::1]"];
const DATE = "2030-03-12";
const MINUTE_MS = 60_000;
const GRID = [1140, 1170, 1200, 1230, 1260, 1290]; // martes de 19:00 a 21:30, de a 30 minutos

const S = INTERVIEW_STATUSES;
const OVERLAP_LEADER = "Interview_no_leader_overlap";
const OVERLAP_MEMBER = "Interview_no_member_overlap";
const ENDS_AFTER = "Interview_ends_after_starts";

class Rollback extends Error {}

const staffIds: string[] = [];
const leaderIds: string[] = [];
const memberIds: string[] = [];
let interviewIds: string[] = [];
let categoryId = "";
let leaderA = "";
let leaderB = "";

function assertLocalDatabase(): void {
  const host = new URL(process.env.DATABASE_URL ?? "").hostname;
  if (!LOCAL_HOSTS.includes(host)) {
    throw new Error(
      `Las pruebas de integración solo corren contra una base local (host actual: ${host}).`,
    );
  }
}

async function newLeader(label: string): Promise<string> {
  const staff = await prisma.staffUser.create({
    data: {
      username: `it-${RUN}-${label}`,
      displayName: `Prueba ${label}`,
      role: STAFF_ROLES.COUNSELOR,
    },
  });
  staffIds.push(staff.id);
  const leader = await prisma.leader.create({ data: { staffUserId: staff.id } });
  leaderIds.push(leader.id);
  return leader.id;
}

async function newMember(): Promise<string> {
  const member = await prisma.member.create({
    data: {
      churchUuid: randomUUID(),
      fullName: `Miembro ${RUN}`,
      fullNameSearch: `miembro ${RUN}`,
    },
  });
  memberIds.push(member.id);
  return member.id;
}

function span(minute: number, duration = 30, date = DATE): { startsAt: Date; endsAt: Date } {
  const startsAt = localToInstant(date, minute);
  return { startsAt, endsAt: new Date(startsAt.getTime() + duration * MINUTE_MS) };
}

interface BookOptions {
  leaderId: string;
  memberId: string;
  minute: number;
  duration?: number;
  status?: InterviewStatus;
  isOverbooking?: boolean;
}

function interviewData(options: BookOptions): Prisma.InterviewUncheckedCreateInput {
  const {
    leaderId,
    memberId,
    minute,
    duration,
    status = S.SCHEDULED,
    isOverbooking = false,
  } = options;
  return { leaderId, memberId, categoryId, status, isOverbooking, ...span(minute, duration) };
}

async function book(options: BookOptions): Promise<string> {
  const created = await prisma.interview.create({ data: interviewData(options) });
  interviewIds.push(created.id);
  return created.id;
}

/** Intenta crear la entrevista y la deshace siempre: dice si la base la aceptaría, sin dejar rastro. */
async function dbWouldAccept(options: BookOptions): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.interview.create({ data: interviewData(options) });
      throw new Rollback();
    });
    return false; // no se llega acá: la transacción siempre termina lanzando
  } catch (error) {
    if (error instanceof Rollback) return true;
    if (String(error).includes("exclusion constraint")) return false;
    throw error;
  }
}

beforeAll(async () => {
  assertLocalDatabase();
  const category = await prisma.interviewCategory.create({ data: { name: `Prueba ${RUN}` } });
  categoryId = category.id;
  leaderA = await newLeader("a");
  leaderB = await newLeader("b");
});

afterEach(async () => {
  await prisma.interview.deleteMany({ where: { id: { in: interviewIds } } });
  interviewIds = [];
});

afterAll(async () => {
  await prisma.interview.deleteMany({ where: { leaderId: { in: leaderIds } } });
  await prisma.member.deleteMany({ where: { id: { in: memberIds } } });
  await prisma.leader.deleteMany({ where: { id: { in: leaderIds } } });
  await prisma.staffUser.deleteMany({ where: { id: { in: staffIds } } });
  await prisma.interviewCategory.deleteMany({ where: { id: categoryId } });
  await prisma.$disconnect();
});

describe("solapamiento de un líder", () => {
  it("rechaza dos entrevistas del mismo líder que se pisan", async () => {
    await book({ leaderId: leaderA, memberId: await newMember(), minute: 1140 });
    const overlapping = book({ leaderId: leaderA, memberId: await newMember(), minute: 1155 }); // 19:15
    await expect(overlapping).rejects.toThrow(OVERLAP_LEADER);
    const identical = book({ leaderId: leaderA, memberId: await newMember(), minute: 1140 });
    await expect(identical).rejects.toThrow(OVERLAP_LEADER);
  });

  it("acepta dos entrevistas pegadas: una termina cuando empieza la otra", async () => {
    await book({ leaderId: leaderA, memberId: await newMember(), minute: 1140 });
    await expect(
      book({ leaderId: leaderA, memberId: await newMember(), minute: 1170 }),
    ).resolves.toBeTypeOf("string");
  });

  it("acepta el mismo horario con líderes distintos", async () => {
    await book({ leaderId: leaderA, memberId: await newMember(), minute: 1140 });
    await expect(
      book({ leaderId: leaderB, memberId: await newMember(), minute: 1140 }),
    ).resolves.toBeTypeOf("string");
  });

  it("acepta un sobreturno encima de una entrevista normal (queda fuera de la restricción)", async () => {
    await book({ leaderId: leaderA, memberId: await newMember(), minute: 1140 });
    const overbooking = book({
      leaderId: leaderA,
      memberId: await newMember(),
      minute: 1140,
      isOverbooking: true,
    });
    await expect(overbooking).resolves.toBeTypeOf("string");
  });

  it("COMPLETED y NO_SHOW ocupan agenda igual que SCHEDULED", async () => {
    for (const status of [S.COMPLETED, S.NO_SHOW]) {
      const id = await book({
        leaderId: leaderA,
        memberId: await newMember(),
        minute: 1140,
        status,
      });
      const again = book({ leaderId: leaderA, memberId: await newMember(), minute: 1140 });
      await expect(again, status).rejects.toThrow(OVERLAP_LEADER);
      await prisma.interview.delete({ where: { id } });
      interviewIds = interviewIds.filter((existing) => existing !== id);
    }
  });

  it("las canceladas liberan el horario, en los tres estados de cancelación", async () => {
    for (const status of [
      S.CANCELLED_BY_MEMBER,
      S.CANCELLED_BY_LEADER_PENDING,
      S.CANCELLED_NOTIFIED,
    ]) {
      await book({ leaderId: leaderA, memberId: await newMember(), minute: 1140, status });
      const replacement = book({ leaderId: leaderA, memberId: await newMember(), minute: 1140 });
      await expect(replacement, status).resolves.toBeTypeOf("string");
      await prisma.interview.deleteMany({ where: { id: { in: interviewIds } } });
      interviewIds = [];
    }
  });

  it("cancelar una entrevista existente libera su horario", async () => {
    const id = await book({ leaderId: leaderA, memberId: await newMember(), minute: 1140 });
    await expect(
      book({ leaderId: leaderA, memberId: await newMember(), minute: 1140 }),
    ).rejects.toThrow(OVERLAP_LEADER);
    await prisma.interview.update({ where: { id }, data: { status: S.CANCELLED_BY_MEMBER } });
    await expect(
      book({ leaderId: leaderA, memberId: await newMember(), minute: 1140 }),
    ).resolves.toBeTypeOf("string");
  });

  it("no deja reactivar una cancelada si su horario ya lo tomó otra entrevista", async () => {
    const cancelled = await book({
      leaderId: leaderA,
      memberId: await newMember(),
      minute: 1140,
      status: S.CANCELLED_BY_MEMBER,
    });
    await book({ leaderId: leaderA, memberId: await newMember(), minute: 1140 });
    const reactivate = prisma.interview.update({
      where: { id: cancelled },
      data: { status: S.SCHEDULED },
    });
    await expect(reactivate).rejects.toThrow(OVERLAP_LEADER);
  });
});

describe("solapamiento de un miembro", () => {
  it("rechaza que un miembro esté en dos entrevistas a la vez con líderes distintos", async () => {
    const memberId = await newMember();
    await book({ leaderId: leaderA, memberId, minute: 1140 });
    await expect(book({ leaderId: leaderB, memberId, minute: 1155 })).rejects.toThrow(
      OVERLAP_MEMBER,
    );
  });

  it("acepta entrevistas seguidas del mismo miembro", async () => {
    const memberId = await newMember();
    await book({ leaderId: leaderA, memberId, minute: 1140 });
    await expect(book({ leaderId: leaderB, memberId, minute: 1170 })).resolves.toBeTypeOf("string");
  });

  it("un sobreturno tampoco deja que el miembro esté en dos lugares a la vez", async () => {
    const memberId = await newMember();
    await book({ leaderId: leaderA, memberId, minute: 1140 });
    const overbooking = book({ leaderId: leaderB, memberId, minute: 1140, isOverbooking: true });
    await expect(overbooking).rejects.toThrow(OVERLAP_MEMBER);
  });

  it("las canceladas del miembro no cuentan", async () => {
    const memberId = await newMember();
    await book({ leaderId: leaderA, memberId, minute: 1140, status: S.CANCELLED_BY_MEMBER });
    await expect(book({ leaderId: leaderB, memberId, minute: 1140 })).resolves.toBeTypeOf("string");
  });
});

describe("coherencia de horarios", () => {
  it("rechaza una entrevista que termina antes de empezar o a la misma hora", async () => {
    const { startsAt } = span(1140);
    const base = { leaderId: leaderA, categoryId, startsAt };
    const equal = prisma.interview.create({
      data: { ...base, memberId: await newMember(), endsAt: startsAt },
    });
    await expect(equal).rejects.toThrow(ENDS_AFTER);
    const before = prisma.interview.create({
      data: {
        ...base,
        memberId: await newMember(),
        endsAt: new Date(startsAt.getTime() - MINUTE_MS),
      },
    });
    await expect(before).rejects.toThrow(ENDS_AFTER);
  });
});

describe("el dominio y la base coinciden", () => {
  it("un horario es libre para `subtractOccupiedSlots` exactamente cuando la base lo aceptaría", async () => {
    await book({ leaderId: leaderA, memberId: await newMember(), minute: 1160, duration: 20 }); // 19:20 a 19:40
    await book({
      leaderId: leaderA,
      memberId: await newMember(),
      minute: 1230,
      status: S.COMPLETED,
    });
    await book({
      leaderId: leaderA,
      memberId: await newMember(),
      minute: 1200,
      status: S.CANCELLED_BY_MEMBER,
    });
    await book({ leaderId: leaderA, memberId: await newMember(), minute: 1260, status: S.NO_SHOW });
    await book({
      leaderId: leaderA,
      memberId: await newMember(),
      minute: 1320,
      isOverbooking: true,
    });

    const stored = await prisma.interview.findMany({ where: { leaderId: leaderA } });
    const existing: ExistingInterview[] = stored.map(
      ({ startsAt, endsAt, status, isOverbooking }) => ({
        startsAt,
        endsAt,
        status,
        isOverbooking,
      }),
    );
    const freeAccordingToDomain = subtractOccupiedSlots(DATE, GRID, 30, existing);

    const probe = await newMember();
    const freeAccordingToDb: number[] = [];
    for (const minute of GRID) {
      if (await dbWouldAccept({ leaderId: leaderA, memberId: probe, minute }))
        freeAccordingToDb.push(minute);
    }

    expect(freeAccordingToDb).toEqual(freeAccordingToDomain);
    expect(freeAccordingToDomain).toEqual([1200, 1290]); // 20:00 (cancelada) y 21:30
  });
});

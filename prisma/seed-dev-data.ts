/** Argentina no usa horario de verano: 19:00 locales son 22:00 UTC. */
export const ARGENTINA_UTC_OFFSET_MINUTES = 3 * 60;
export const DEV_INTERVIEW_MINUTES = 30;
export const DEV_MEMBER_COUNT = 24;

const FIRST_NAMES = ["Juan", "María", "Carlos", "Lucía", "Pedro", "Ana", "Diego", "Sofía"] as const;
const LAST_NAMES = ["Gómez", "Rojas", "Pérez", "Díaz", "Silva", "Vera", "Luna", "Acosta"] as const;

export function devMemberName(index: number): string {
  const first = FIRST_NAMES[index % FIRST_NAMES.length];
  const last = LAST_NAMES[(index + Math.floor(index / FIRST_NAMES.length)) % LAST_NAMES.length];
  return `${first} ${last}`;
}

export function devMemberUuid(index: number): string {
  return `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
}

export const DEV_STAFF = [
  {
    key: "principal",
    username: "obispo.dev",
    displayName: "Obispo de prueba",
    role: "PRINCIPAL",
    sortOrder: 0,
  },
  {
    key: "counselor1",
    username: "consejero1.dev",
    displayName: "Primer consejero de prueba",
    role: "COUNSELOR",
    sortOrder: 1,
  },
  {
    key: "counselor2",
    username: "consejero2.dev",
    displayName: "Segundo consejero de prueba",
    role: "COUNSELOR",
    sortOrder: 2,
  },
] as const;

export type DevLeaderKey = (typeof DEV_STAFF)[number]["key"];

const HOUR = 60;

/** weekOffset 0 = próximo martes; -1 = el martes anterior. */
export const DEV_INTERVIEWS = [
  {
    id: "dev_interview_1",
    weekOffset: 0,
    startMinute: 19 * HOUR,
    leader: "principal",
    member: 0,
    sensitive: false,
    status: "SCHEDULED",
  },
  {
    id: "dev_interview_2",
    weekOffset: 0,
    startMinute: 19 * HOUR + 30,
    leader: "principal",
    member: 1,
    sensitive: false,
    status: "SCHEDULED",
  },
  {
    id: "dev_interview_3",
    weekOffset: 0,
    startMinute: 20 * HOUR,
    leader: "principal",
    member: 4,
    sensitive: true,
    status: "SCHEDULED",
  },
  {
    id: "dev_interview_4",
    weekOffset: 0,
    startMinute: 20 * HOUR + 30,
    leader: "principal",
    member: 5,
    sensitive: false,
    status: "CANCELLED_BY_MEMBER",
  },
  {
    id: "dev_interview_5",
    weekOffset: 0,
    startMinute: 19 * HOUR,
    leader: "counselor1",
    member: 2,
    sensitive: false,
    status: "SCHEDULED",
  },
  {
    id: "dev_interview_6",
    weekOffset: 0,
    startMinute: 19 * HOUR,
    leader: "counselor2",
    member: 3,
    sensitive: false,
    status: "SCHEDULED",
  },
  {
    id: "dev_interview_7",
    weekOffset: -1,
    startMinute: 19 * HOUR,
    leader: "principal",
    member: 6,
    sensitive: false,
    status: "COMPLETED",
  },
] as const;

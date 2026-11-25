import { describe, expect, it } from "vitest";
import { STAFF_ROLES } from "@/shared/constants/roles.constants";
import {
  checkLeaderEligibility,
  eligibleLeaders,
  LEADER_ELIGIBILITY,
  type LeaderCandidate,
} from "./leader-eligibility";

const SENSITIVE = { isSensitive: true };
const ORDINARY = { isSensitive: false };

const principal = { id: "p1", role: STAFF_ROLES.PRINCIPAL, isActive: true } as const;
const counselor1 = { id: "c1", role: STAFF_ROLES.COUNSELOR, isActive: true } as const;
const counselor2 = { id: "c2", role: STAFF_ROLES.COUNSELOR, isActive: true } as const;

const ids = (leaders: readonly { id: string }[]) => leaders.map((leader) => leader.id);

describe("eligibleLeaders: asunto común", () => {
  it("ofrece al obispo y a los consejeros activos, en el orden recibido", () => {
    expect(ids(eligibleLeaders([principal, counselor1, counselor2], ORDINARY))).toEqual([
      "p1",
      "c1",
      "c2",
    ]);
    expect(ids(eligibleLeaders([counselor2, principal, counselor1], ORDINARY))).toEqual([
      "c2",
      "p1",
      "c1",
    ]);
  });

  it("no ofrece a un consejero inactivo", () => {
    expect(
      ids(eligibleLeaders([principal, { ...counselor1, isActive: false }, counselor2], ORDINARY)),
    ).toEqual(["p1", "c2"]);
  });

  it("si todos los consejeros están inactivos queda solo el obispo", () => {
    const leaders = [
      principal,
      { ...counselor1, isActive: false },
      { ...counselor2, isActive: false },
    ];
    expect(ids(eligibleLeaders(leaders, ORDINARY))).toEqual(["p1"]);
  });
});

describe("eligibleLeaders: asunto sensible", () => {
  it("solo ofrece al obispo, aunque los consejeros estén activos", () => {
    expect(ids(eligibleLeaders([principal, counselor1, counselor2], SENSITIVE))).toEqual(["p1"]);
  });

  it("sin obispo en la lista no hay a quién ofrecer", () => {
    expect(eligibleLeaders([counselor1, counselor2], SENSITIVE)).toEqual([]);
  });
});

describe("relevo del obispo", () => {
  it("el registro del obispo relevado (inactivo) no se ofrece y su reemplazo sí, en cualquier asunto", () => {
    const former = { id: "p-viejo", role: STAFF_ROLES.PRINCIPAL, isActive: false } as const;
    const current = { id: "p-nuevo", role: STAFF_ROLES.PRINCIPAL, isActive: true } as const;
    for (const category of [ORDINARY, SENSITIVE]) {
      expect(ids(eligibleLeaders([former, current, counselor1], category))).toEqual(
        category.isSensitive ? ["p-nuevo"] : ["p-nuevo", "c1"],
      );
    }
  });
});

describe("eligibleLeaders: general", () => {
  it("lista vacía da lista vacía, devuelve los mismos objetos y no modifica lo recibido", () => {
    expect(eligibleLeaders([], ORDINARY)).toEqual([]);
    const input = Object.freeze([principal, counselor1]);
    const result = eligibleLeaders(input, ORDINARY);
    expect(result).not.toBe(input);
    expect(result[0]).toBe(principal);
  });

  it("la secretaria no es un líder posible (error de tipos)", () => {
    // @ts-expect-error el rol SECRETARY no existe entre los líderes
    const invalid: LeaderCandidate = { role: STAFF_ROLES.SECRETARY, isActive: true };
    expect(invalid.isActive).toBe(true);
  });
});

describe("checkLeaderEligibility", () => {
  it("devuelve ELIGIBLE cuando corresponde", () => {
    expect(checkLeaderEligibility(principal, SENSITIVE)).toBe(LEADER_ELIGIBILITY.ELIGIBLE);
    expect(checkLeaderEligibility(counselor1, ORDINARY)).toBe(LEADER_ELIGIBILITY.ELIGIBLE);
  });

  it("un consejero con un asunto sensible es FORBIDDEN_FOR_CATEGORY, esté activo o no", () => {
    expect(checkLeaderEligibility(counselor1, SENSITIVE)).toBe(
      LEADER_ELIGIBILITY.FORBIDDEN_FOR_CATEGORY,
    );
    expect(checkLeaderEligibility({ ...counselor1, isActive: false }, SENSITIVE)).toBe(
      LEADER_ELIGIBILITY.FORBIDDEN_FOR_CATEGORY,
    );
  });

  it("un líder inactivo es NOT_AVAILABLE, también el obispo relevado", () => {
    expect(checkLeaderEligibility({ ...counselor1, isActive: false }, ORDINARY)).toBe(
      LEADER_ELIGIBILITY.NOT_AVAILABLE,
    );
    expect(checkLeaderEligibility({ ...principal, isActive: false }, ORDINARY)).toBe(
      LEADER_ELIGIBILITY.NOT_AVAILABLE,
    );
    expect(checkLeaderEligibility({ ...principal, isActive: false }, SENSITIVE)).toBe(
      LEADER_ELIGIBILITY.NOT_AVAILABLE,
    );
  });
});

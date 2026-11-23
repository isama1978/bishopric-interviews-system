import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { INTERVIEW_EVENT_TYPES, INTERVIEW_STATUSES } from "./interview.constants";
import { STAFF_ROLES } from "./roles.constants";

const SCHEMA_PATH = "prisma/schema.prisma";

function readSchemaEnums(): Map<string, string[]> {
  const schema = readFileSync(SCHEMA_PATH, "utf8");
  const enums = new Map<string, string[]>();
  for (const match of schema.matchAll(/enum\s+(\w+)\s*\{([^}]*)\}/g)) {
    const [, name, body] = match;
    if (!name || body === undefined) continue;
    const values = body
      .split("\n")
      .map((line) => line.replace(/\/\/.*$/, "").trim())
      .filter(Boolean);
    enums.set(name, values);
  }
  return enums;
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

describe("constantes alineadas con prisma/schema.prisma", () => {
  const enums = readSchemaEnums();

  it("StaffRole", () => {
    expect(sorted(enums.get("StaffRole") ?? [])).toEqual(sorted(Object.values(STAFF_ROLES)));
  });

  it("InterviewStatus", () => {
    expect(sorted(enums.get("InterviewStatus") ?? [])).toEqual(
      sorted(Object.values(INTERVIEW_STATUSES)),
    );
  });

  it("InterviewEventType", () => {
    expect(sorted(enums.get("InterviewEventType") ?? [])).toEqual(
      sorted(Object.values(INTERVIEW_EVENT_TYPES)),
    );
  });
});

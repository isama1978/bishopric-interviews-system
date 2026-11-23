import { describe, expect, it } from "vitest";
import { errorMessages } from "@/shared/messages/messages.es";
import { ForbiddenError, NotAuthenticatedError, StaffRoleLimitReachedError } from "./access.errors";
import { DomainError, isDomainError } from "./domain-error";
import { ERROR_CODES } from "./error-codes";
import { NotFoundError, ValidationFailedError } from "./general.errors";
import {
  ForbiddenLeaderForCategoryError,
  InvalidStatusTransitionError,
  LeaderNotAvailableError,
  MemberAlreadyBookedError,
  OverbookingLimitReachedError,
  SensitiveNotReassignableError,
  SlotAlreadyTakenError,
  SlotNotOfferedError,
} from "./interview.errors";

const allErrors: readonly DomainError[] = [
  new ValidationFailedError(),
  new NotAuthenticatedError(),
  new ForbiddenError(),
  new NotFoundError("cita"),
  new SlotAlreadyTakenError(),
  new MemberAlreadyBookedError(),
  new SlotNotOfferedError(),
  new LeaderNotAvailableError(),
  new ForbiddenLeaderForCategoryError(),
  new OverbookingLimitReachedError(),
  new SensitiveNotReassignableError(),
  new InvalidStatusTransitionError("COMPLETED", "SCHEDULED"),
  new StaffRoleLimitReachedError("COUNSELOR"),
];

describe("errores de dominio", () => {
  it("cada código de error tiene una clase que lo lanza", () => {
    const codes = allErrors.map((error) => error.code).sort();
    expect(codes).toEqual(Object.values(ERROR_CODES).sort());
  });

  it("todos son DomainError y Error, y se reconocen con isDomainError", () => {
    for (const error of allErrors) {
      expect(error).toBeInstanceOf(Error);
      expect(isDomainError(error)).toBe(true);
    }
    expect(isDomainError(new Error("otro"))).toBe(false);
    expect(isDomainError("texto")).toBe(false);
  });

  it("todos tienen un mensaje de interfaz no vacío", () => {
    for (const error of allErrors) {
      expect(errorMessages[error.code].length).toBeGreaterThan(0);
    }
  });

  it("conservan la causa original", () => {
    const cause = new Error("violación de restricción");
    expect(new SlotAlreadyTakenError({ cause }).cause).toBe(cause);
    expect(new MemberAlreadyBookedError({ cause }).cause).toBe(cause);
  });

  it("ValidationFailedError lleva nombres de campos", () => {
    expect(new ValidationFailedError(["email"]).fields).toEqual(["email"]);
  });
});

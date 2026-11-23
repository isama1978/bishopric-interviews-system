import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ForbiddenError } from "./access.errors";
import { ERROR_CODES } from "./error-codes";
import { ERROR_HTTP_STATUS, INTERNAL_ERROR_CODE, mapError } from "./error-mapping";
import { ValidationFailedError } from "./general.errors";
import { SlotAlreadyTakenError } from "./interview.errors";

describe("mapError", () => {
  it("traduce un error de dominio a su código, estado y mensaje", () => {
    const mapped = mapError(new SlotAlreadyTakenError());
    expect(mapped.status).toBe(409);
    expect(mapped.payload.code).toBe(ERROR_CODES.SLOT_ALREADY_TAKEN);
    expect(mapped.isUnexpected).toBe(false);
  });

  it("devuelve 403 para un permiso denegado", () => {
    expect(mapError(new ForbiddenError()).status).toBe(403);
  });

  it("todo código tiene un estado HTTP de error de cliente", () => {
    for (const code of Object.values(ERROR_CODES)) {
      expect(ERROR_HTTP_STATUS[code]).toBeGreaterThanOrEqual(400);
      expect(ERROR_HTTP_STATUS[code]).toBeLessThan(500);
    }
  });

  it("incluye los campos de un ValidationFailedError", () => {
    expect(mapError(new ValidationFailedError(["email"])).payload.fields).toEqual(["email"]);
  });

  it("traduce un error de Zod a VALIDATION_FAILED con solo nombres de campos", () => {
    const schema = z.object({ email: z.string(), address: z.object({ city: z.string() }) });
    const result = schema.safeParse({ email: 123, address: {} });
    if (result.success) throw new Error("se esperaba un error de validación");

    const mapped = mapError(result.error);
    expect(mapped.status).toBe(400);
    expect(mapped.payload.code).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(mapped.payload.fields).toEqual(["email", "address.city"]);
  });

  it("un error desconocido es 500 con mensaje genérico y no filtra su detalle", () => {
    const mapped = mapError(new Error("detalle con dato personal"));
    expect(mapped.status).toBe(500);
    expect(mapped.payload.code).toBe(INTERNAL_ERROR_CODE);
    expect(mapped.isUnexpected).toBe(true);
    expect(JSON.stringify(mapped.payload)).not.toContain("dato personal");
  });
});

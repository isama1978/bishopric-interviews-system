import { redirect } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SlotAlreadyTakenError } from "@/shared/errors/interview.errors";
import { errorResponse, runAction, withErrorHandling } from "./error-handling";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("errorResponse", () => {
  it("devuelve JSON con el estado y el formato uniforme", async () => {
    const response = errorResponse(new SlotAlreadyTakenError());
    expect(response.status).toBe(409);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("SLOT_ALREADY_TAKEN");
  });
});

describe("withErrorHandling", () => {
  it("deja pasar la respuesta normal", async () => {
    const handler = withErrorHandling(async () => new Response("ok"));
    expect(await (await handler()).text()).toBe("ok");
  });

  it("traduce un error lanzado por el handler", async () => {
    const handler = withErrorHandling(async () => {
      throw new SlotAlreadyTakenError();
    });
    expect((await handler()).status).toBe(409);
  });
});

describe("runAction", () => {
  it("devuelve los datos cuando todo sale bien", async () => {
    expect(await runAction(async () => 42)).toEqual({ ok: true, data: 42 });
  });

  it("devuelve el error de dominio como resultado, sin lanzar", async () => {
    const result = await runAction(async () => {
      throw new SlotAlreadyTakenError();
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SLOT_ALREADY_TAKEN");
  });

  it("un error inesperado devuelve el mensaje genérico y registra solo su tipo", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await runAction(async () => {
      throw new Error("detalle con dato personal");
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INTERNAL_ERROR");
    expect(spy).toHaveBeenCalledWith("Error inesperado (Error).");
  });

  it("no se traga una redirección de Next", async () => {
    await expect(
      runAction(async () => {
        redirect("/login");
      }),
    ).rejects.toThrow();
  });
});

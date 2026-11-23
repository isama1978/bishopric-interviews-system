import { unstable_rethrow } from "next/navigation";
import { mapError, type ErrorPayload } from "@/shared/errors/error-mapping";
import { reportUnexpectedError } from "@/shared/errors/report-unexpected-error";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ErrorPayload };

/** Respuesta JSON uniforme: `{ "error": { code, message, fields? } }`. */
export function errorResponse(error: unknown): Response {
  const mapped = mapError(error);
  if (mapped.isUnexpected) reportUnexpectedError(error);
  return Response.json({ error: mapped.payload }, { status: mapped.status });
}

/** Para `route.ts`: captura los errores del handler y los traduce a una respuesta. */
export function withErrorHandling<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response>,
): (...args: TArgs) => Promise<Response> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      unstable_rethrow(error); // redirect() y notFound() no son errores a capturar
      return errorResponse(error);
    }
  };
}

/** Para Server Actions: devuelve un resultado serializable en lugar de lanzar. */
export async function runAction<T>(action: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await action() };
  } catch (error) {
    unstable_rethrow(error);
    const mapped = mapError(error);
    if (mapped.isUnexpected) reportUnexpectedError(error);
    return { ok: false, error: mapped.payload };
  }
}

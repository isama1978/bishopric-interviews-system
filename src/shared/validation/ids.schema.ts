import { z } from "zod";
import { messages } from "@/shared/messages/messages.es";

/** Identificador interno (`cuid` de Prisma) de cualquier modelo. */
export const cuidSchema = z.cuid({ error: messages.validation.invalidId });

/**
 * `Member.churchUuid`: identificador que trae el listado de origen.
 * Se usa `guid` (formato 8-4-4-4-12 sin exigir versión) porque es un dato externo
 * que no controlamos, y se pasa a minúsculas para que dos escrituras del mismo uuid
 * no generen dos miembros.
 */
export const churchUuidSchema = z
  .guid({ error: messages.validation.invalidUuid })
  .transform((value) => value.toLowerCase());

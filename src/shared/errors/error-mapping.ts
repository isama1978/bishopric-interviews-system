import { ZodError } from "zod";
import { HTTP_STATUS } from "@/shared/constants/http.constants";
import { errorMessages, messages } from "@/shared/messages/messages.es";
import { isDomainError } from "./domain-error";
import { ERROR_CODES, type ErrorCode } from "./error-codes";
import { ValidationFailedError } from "./general.errors";

export const INTERNAL_ERROR_CODE = "INTERNAL_ERROR";

/** Un estado HTTP por cada código: `Record<ErrorCode, ...>` obliga a definirlo al agregar uno. */
export const ERROR_HTTP_STATUS: Readonly<Record<ErrorCode, number>> = {
  [ERROR_CODES.VALIDATION_FAILED]: HTTP_STATUS.BAD_REQUEST,
  [ERROR_CODES.NOT_AUTHENTICATED]: HTTP_STATUS.UNAUTHORIZED,
  [ERROR_CODES.FORBIDDEN]: HTTP_STATUS.FORBIDDEN,
  [ERROR_CODES.NOT_FOUND]: HTTP_STATUS.NOT_FOUND,
  [ERROR_CODES.SLOT_ALREADY_TAKEN]: HTTP_STATUS.CONFLICT,
  [ERROR_CODES.MEMBER_ALREADY_BOOKED]: HTTP_STATUS.CONFLICT,
  [ERROR_CODES.SLOT_NOT_OFFERED]: HTTP_STATUS.UNPROCESSABLE_ENTITY,
  [ERROR_CODES.LEADER_NOT_AVAILABLE]: HTTP_STATUS.UNPROCESSABLE_ENTITY,
  [ERROR_CODES.FORBIDDEN_LEADER_FOR_CATEGORY]: HTTP_STATUS.FORBIDDEN,
  [ERROR_CODES.OVERBOOKING_LIMIT_REACHED]: HTTP_STATUS.CONFLICT,
  [ERROR_CODES.SENSITIVE_NOT_REASSIGNABLE]: HTTP_STATUS.CONFLICT,
  [ERROR_CODES.INVALID_STATUS_TRANSITION]: HTTP_STATUS.CONFLICT,
  [ERROR_CODES.STAFF_ROLE_LIMIT_REACHED]: HTTP_STATUS.CONFLICT,
};

export interface ErrorPayload {
  code: ErrorCode | typeof INTERNAL_ERROR_CODE;
  message: string;
  /** Solo nombres de campos, nunca sus valores. */
  fields?: readonly string[];
}

export interface MappedError {
  status: number;
  payload: ErrorPayload;
  /** true cuando no es un error esperable del negocio y hay que registrarlo. */
  isUnexpected: boolean;
}

function knownError(code: ErrorCode, fields: readonly string[] = []): MappedError {
  const payload: ErrorPayload = { code, message: errorMessages[code] };
  if (fields.length > 0) payload.fields = fields;
  return { status: ERROR_HTTP_STATUS[code], payload, isUnexpected: false };
}

function fieldNamesOf(error: ZodError): string[] {
  const names = error.issues.map((issue) => issue.path.map(String).join("."));
  return [...new Set(names.filter((name) => name !== ""))];
}

export function mapError(error: unknown): MappedError {
  if (isDomainError(error)) {
    const fields = error instanceof ValidationFailedError ? error.fields : [];
    return knownError(error.code, fields);
  }
  if (error instanceof ZodError) {
    return knownError(ERROR_CODES.VALIDATION_FAILED, fieldNamesOf(error));
  }
  return {
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    payload: { code: INTERNAL_ERROR_CODE, message: messages.errors.unexpected },
    isUnexpected: true,
  };
}

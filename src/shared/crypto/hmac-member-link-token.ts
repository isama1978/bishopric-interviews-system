import { createHmac, timingSafeEqual } from "node:crypto";
import {
  INVALID_LINK_SECRET_MESSAGE,
  INVALID_LINK_VERSION_MESSAGE,
  LINK_HMAC_ALGORITHM,
  LINK_SIGNATURE_CONTEXT,
  LINK_SIGNATURE_ENCODING,
  LINK_TOKEN_SEPARATOR,
  MAX_LINK_TOKEN_LENGTH,
} from "@/shared/constants/crypto.constants";
import { MIN_SECRET_LENGTH } from "@/shared/constants/env.constants";
import { cuidSchema } from "@/shared/validation";
import type { MemberLinkTokenService } from "./member-link-token";

interface ParsedToken {
  memberId: string;
  signature: string;
}

function isValidVersion(version: number): boolean {
  return Number.isSafeInteger(version) && version > 0;
}

function computeSignature(secret: string, memberId: string, version: number): Buffer {
  const message = [LINK_SIGNATURE_CONTEXT, memberId, version].join(":");
  return createHmac(LINK_HMAC_ALGORITHM, secret).update(message).digest();
}

function parseToken(token: string): ParsedToken | null {
  if (token.length > MAX_LINK_TOKEN_LENGTH) return null;
  const [memberId, signature, ...extra] = token.split(LINK_TOKEN_SEPARATOR);
  if (memberId === undefined || signature === undefined || extra.length > 0) return null;
  if (!cuidSchema.safeParse(memberId).success) return null;
  return { memberId, signature };
}

/** Compara en tiempo constante y exige la forma canónica de la firma (sin caracteres de más). */
function signatureMatches(expected: Buffer, signature: string): boolean {
  const actual = Buffer.from(signature, LINK_SIGNATURE_ENCODING);
  if (actual.length !== expected.length) return false;
  if (actual.toString(LINK_SIGNATURE_ENCODING) !== signature) return false;
  return timingSafeEqual(expected, actual);
}

/** Crea el servicio con `MEMBER_LINK_SECRET`. */
export function createMemberLinkTokenService(secret: string): MemberLinkTokenService {
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(INVALID_LINK_SECRET_MESSAGE);
  }
  return {
    issue(memberId, linkTokenVersion) {
      if (!isValidVersion(linkTokenVersion)) {
        throw new Error(INVALID_LINK_VERSION_MESSAGE);
      }
      const signature = computeSignature(secret, memberId, linkTokenVersion);
      return [memberId, signature.toString(LINK_SIGNATURE_ENCODING)].join(LINK_TOKEN_SEPARATOR);
    },
    readMemberId(token) {
      return parseToken(token)?.memberId ?? null;
    },
    verify(token, linkTokenVersion) {
      const parsed = parseToken(token);
      if (parsed === null || !isValidVersion(linkTokenVersion)) return false;
      const expected = computeSignature(secret, parsed.memberId, linkTokenVersion);
      return signatureMatches(expected, parsed.signature);
    },
  };
}

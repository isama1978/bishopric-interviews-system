import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import {
  AUTH_TAG_BYTES,
  CIPHER_ALGORITHM,
  CURRENT_KEY_VERSION,
  INVALID_KEY_MESSAGE,
  IV_BYTES,
  KEY_ENCODING,
  KEY_VERSION_BYTES,
  PAYLOAD_ENCODING,
  TEXT_ENCODING,
} from "@/shared/constants/crypto.constants";
import { ENCRYPTION_KEY_BYTES } from "@/shared/constants/env.constants";
import { DecryptionFailedError } from "./decryption-failed.error";
import type { TextCipher } from "./text-cipher";

const IV_START = KEY_VERSION_BYTES;
const TAG_START = IV_START + IV_BYTES;
const HEADER_BYTES = TAG_START + AUTH_TAG_BYTES;

function parseKey(keyBase64: string): Buffer {
  const key = Buffer.from(keyBase64, KEY_ENCODING);
  if (key.length !== ENCRYPTION_KEY_BYTES) {
    throw new Error(INVALID_KEY_MESSAGE);
  }
  return key;
}

function encryptText(key: Buffer, plainText: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(CIPHER_ALGORITHM, key, iv, { authTagLength: AUTH_TAG_BYTES });
  const data = Buffer.concat([cipher.update(plainText, TEXT_ENCODING), cipher.final()]);
  const version = Buffer.from([CURRENT_KEY_VERSION]);
  return Buffer.concat([version, iv, cipher.getAuthTag(), data]).toString(PAYLOAD_ENCODING);
}

function decryptPayload(key: Buffer, encoded: string): string {
  const payload = Buffer.from(encoded, PAYLOAD_ENCODING);
  if (payload.length < HEADER_BYTES || payload[0] !== CURRENT_KEY_VERSION) {
    throw new DecryptionFailedError();
  }
  const iv = payload.subarray(IV_START, TAG_START);
  const tag = payload.subarray(TAG_START, HEADER_BYTES);
  const data = payload.subarray(HEADER_BYTES);
  try {
    const decipher = createDecipheriv(CIPHER_ALGORITHM, key, iv, { authTagLength: AUTH_TAG_BYTES });
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(TEXT_ENCODING);
  } catch (error) {
    throw new DecryptionFailedError({ cause: error });
  }
}

/** Crea el cifrador AES-256-GCM con la clave en base64 (`APP_ENCRYPTION_KEY`). */
export function createAesGcmCipher(keyBase64: string): TextCipher {
  const key = parseKey(keyBase64);
  return {
    encrypt: (plainText) => encryptText(key, plainText),
    decrypt: (payload) => decryptPayload(key, payload),
  };
}

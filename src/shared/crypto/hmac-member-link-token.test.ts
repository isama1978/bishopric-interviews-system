import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { MAX_LINK_TOKEN_LENGTH } from "@/shared/constants/crypto.constants";
import { createMemberLinkTokenService } from "./hmac-member-link-token";

const newSecret = () => randomBytes(32).toString("base64");
const service = createMemberLinkTokenService(newSecret());
const MEMBER_A = "cmgx7k2p10000abcd1234efgh";
const MEMBER_B = "cmgx7k2p10001zyxw9876vuts";
const TOKEN_FORMAT = /^[a-z0-9]{25}\.[A-Za-z0-9_-]{43}$/;

function changeLastChar(token: string): string {
  const last = token.endsWith("A") ? "B" : "A";
  return token.slice(0, -1) + last;
}

describe("enlace personal del miembro (HMAC)", () => {
  it("emite `<memberId>.<firma>` y lo verifica con la misma versión", () => {
    const token = service.issue(MEMBER_A, 1);
    expect(token).toMatch(TOKEN_FORMAT);
    expect(token.startsWith(`${MEMBER_A}.`)).toBe(true);
    expect(service.verify(token, 1)).toBe(true);
  });

  it("es determinista: no se guarda, se recalcula", () => {
    expect(service.issue(MEMBER_A, 3)).toBe(service.issue(MEMBER_A, 3));
  });

  it("subir la versión invalida el enlace anterior", () => {
    const old = service.issue(MEMBER_A, 1);
    expect(service.verify(old, 2)).toBe(false);
    expect(service.verify(service.issue(MEMBER_A, 2), 2)).toBe(true);
    expect(service.issue(MEMBER_A, 1)).not.toBe(service.issue(MEMBER_A, 11));
  });

  it("la firma de un miembro no sirve para otro", () => {
    const signatureOfA = service.issue(MEMBER_A, 1).split(".")[1];
    expect(service.verify(`${MEMBER_B}.${signatureOfA}`, 1)).toBe(false);
  });

  it("una clave distinta no verifica enlaces ajenos", () => {
    const other = createMemberLinkTokenService(newSecret());
    expect(other.verify(service.issue(MEMBER_A, 1), 1)).toBe(false);
  });

  it("rechaza firmas alteradas, truncadas, con caracteres de más o con relleno", () => {
    const token = service.issue(MEMBER_A, 1);
    for (const bad of [
      changeLastChar(token),
      token.slice(0, -1),
      `${token}A`,
      `${token}=`,
      `${token}.x`,
    ]) {
      expect(service.verify(bad, 1), bad).toBe(false);
    }
  });

  it("verify no lanza con datos basura y devuelve false", () => {
    const garbage = [
      "",
      ".",
      "..",
      "hola",
      `${MEMBER_A}.`,
      `.${"A".repeat(43)}`,
      "x".repeat(MAX_LINK_TOKEN_LENGTH + 1),
      `${MEMBER_A}.${"A".repeat(43)}`,
      "😀.😀",
    ];
    for (const token of garbage) expect(service.verify(token, 1), token).toBe(false);
  });

  it("verify devuelve false con versiones inválidas e issue las rechaza", () => {
    const token = service.issue(MEMBER_A, 1);
    for (const version of [0, -1, 1.5, Number.NaN, Infinity]) {
      expect(service.verify(token, version)).toBe(false);
      expect(() => service.issue(MEMBER_A, version)).toThrow();
    }
  });

  it("readMemberId devuelve el id del token y null si el formato no sirve (no autentica)", () => {
    expect(service.readMemberId(service.issue(MEMBER_A, 1))).toBe(MEMBER_A);
    expect(service.readMemberId(`${MEMBER_A}.firma-inventada`)).toBe(MEMBER_A);
    for (const bad of ["", "hola", `${MEMBER_A}`, "a.b.c", "no-es-cuid.abc", "x".repeat(200)]) {
      expect(service.readMemberId(bad), bad).toBeNull();
    }
  });

  it("rechaza un secreto demasiado corto al crearse", () => {
    expect(() => createMemberLinkTokenService("corto")).toThrow();
    expect(() => createMemberLinkTokenService("")).toThrow();
  });
});

/** Puerto del enlace personal del miembro (`/m/<token>`). Lo implementa `createMemberLinkTokenService`. */
export interface MemberLinkTokenService {
  /** Arma el token `<memberId>.<firma>`. No se guarda: se recalcula cuando hace falta. */
  issue(memberId: string, linkTokenVersion: number): string;

  /**
   * Extrae el `memberId` que dice el token, o `null` si el formato es inválido.
   * NO autentica: solo sirve para buscar al miembro y obtener su `linkTokenVersion`;
   * después hay que llamar a `verify`.
   */
  readMemberId(token: string): string | null;

  /** `true` solo si la firma corresponde a ese miembro y a esa versión. Nunca lanza por datos inválidos. */
  verify(token: string, linkTokenVersion: number): boolean;
}

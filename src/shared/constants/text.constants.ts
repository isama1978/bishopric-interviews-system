/** Forma de descomposición: separa las letras de sus acentos y desarma ligaduras y letras de ancho completo. */
export const NAME_DECOMPOSITION_FORM = "NFKD";

/** Marcas combinantes (acentos, diéresis, tilde de la ñ, cedilla...) que quedan sueltas tras descomponer. */
export const COMBINING_MARKS_PATTERN = /\p{M}/gu;

/** Guion simple y variantes (‐ ‑ ‒ – — ― −): separan palabras. */
export const DASH_PATTERN = /[-\u2010-\u2015\u2212]/gu;

/** Todo lo que no sea letra, número o espacio (puntos, apóstrofes, paréntesis, emojis, invisibles). */
export const NAME_NOISE_PATTERN = /[^\p{L}\p{N}\s]/gu;

export const WHITESPACE_PATTERN = /\s+/gu;
export const SINGLE_SPACE = " ";

/** Letras que Unicode no descompone en «letra + acento». */
export const SPECIAL_LETTER_PATTERN = /[ßæœøłđ]/gu;
export const SPECIAL_LETTER_REPLACEMENTS: Readonly<Record<string, string>> = {
  ß: "ss",
  æ: "ae",
  œ: "oe",
  ø: "o",
  ł: "l",
  đ: "d",
};

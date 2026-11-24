import {
  COMBINING_MARKS_PATTERN,
  DASH_PATTERN,
  NAME_DECOMPOSITION_FORM,
  NAME_NOISE_PATTERN,
  SINGLE_SPACE,
  SPECIAL_LETTER_PATTERN,
  SPECIAL_LETTER_REPLACEMENTS,
  WHITESPACE_PATTERN,
} from "@/shared/constants/text.constants";

function replaceSpecialLetters(text: string): string {
  return text.replace(
    SPECIAL_LETTER_PATTERN,
    (letter) => SPECIAL_LETTER_REPLACEMENTS[letter] ?? letter,
  );
}

/**
 * Forma de comparación de un nombre: sin acentos (la ñ pasa a n), en minúsculas, con los
 * guiones convertidos en espacios, sin otra puntuación y con espacios simples.
 *
 * «María-José  O'Brien» → «maria jose obrien».
 *
 * Es la única función que se usa tanto para guardar `Member.fullNameSearch` como para
 * normalizar lo que se escribe en el buscador: las dos puntas tienen que coincidir.
 * Si esta regla cambia, hay que recalcular `fullNameSearch` de todos los miembros.
 */
export function normalizeName(name: string): string {
  const withoutAccents = name
    .normalize(NAME_DECOMPOSITION_FORM)
    .replace(COMBINING_MARKS_PATTERN, "");
  return replaceSpecialLetters(withoutAccents.toLowerCase())
    .replace(DASH_PATTERN, SINGLE_SPACE)
    .replace(NAME_NOISE_PATTERN, "")
    .replace(WHITESPACE_PATTERN, SINGLE_SPACE)
    .trim();
}

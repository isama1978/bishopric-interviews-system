import { CSV_BOM, CSV_PARSE_ERROR_MESSAGE } from "@/shared/constants/import.constants";

/** Una fila del CSV con la línea del archivo donde empieza (un campo entre comillas puede ocupar varias). */
export interface CsvRecord {
  line: number;
  fields: string[];
}

/** El archivo tiene comillas sin cerrar o mal ubicadas. `line` es la línea donde se detectó. */
export class CsvParseError extends Error {
  readonly line: number;

  constructor(line: number) {
    super(CSV_PARSE_ERROR_MESSAGE);
    this.name = "CsvParseError";
    this.line = line;
  }
}

type State = "start" | "unquoted" | "quoted" | "afterQuote";

/**
 * Lector de CSV (RFC 4180): separador coma, campos entre comillas con `""` como comilla,
 * saltos de línea dentro de las comillas, finales de línea `\n`, `\r\n` o `\r`, y una marca BOM
 * inicial opcional (la agregan Excel y otros). Devuelve todas las filas, incluidas las vacías.
 * Lanza `CsvParseError` si una comilla queda abierta o seguida de texto antes de la coma.
 */
export function parseCsv(input: string): CsvRecord[] {
  const text = input.startsWith(CSV_BOM) ? input.slice(1) : input;
  const records: CsvRecord[] = [];
  let fields: string[] = [];
  let field = "";
  let state: State = "start";
  let line = 1;
  let recordLine = 1;

  const endField = (): void => {
    fields.push(field);
    field = "";
    state = "start";
  };
  const endRecord = (): void => {
    endField();
    records.push({ line: recordLine, fields });
    fields = [];
    line += 1;
    recordLine = line;
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text.charAt(index);
    if (state === "quoted") {
      if (char !== '"') {
        field += char;
        if (char === "\n") line += 1;
      } else if (text.charAt(index + 1) === '"') {
        field += '"';
        index += 1;
      } else {
        state = "afterQuote";
      }
      continue;
    }
    if (char === ",") {
      endField();
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text.charAt(index + 1) === "\n") index += 1;
      endRecord();
    } else if (state === "afterQuote") {
      throw new CsvParseError(line);
    } else if (char === '"' && state === "start") {
      state = "quoted";
    } else {
      field += char;
      state = "unquoted";
    }
  }

  if (state === "quoted") throw new CsvParseError(recordLine);
  if (state !== "start" || field !== "" || fields.length > 0) {
    endField();
    records.push({ line: recordLine, fields });
  }
  return records;
}

import { z } from "zod";
import {
  MAX_EMAIL_LENGTH,
  MAX_IMPORT_ROWS,
  MAX_NAME_LENGTH,
  MAX_PHONE_LENGTH,
  MEMBER_CSV_COLUMNS,
  type MemberCsvColumn,
} from "@/shared/constants/import.constants";
import { CsvParseError, parseCsv, type CsvRecord } from "@/shared/csv/parse-csv";
import { messages } from "@/shared/messages/messages.es";
import { normalizeName } from "@/shared/text";
import { churchUuidSchema } from "@/shared/validation";

const text = messages.memberImport;
const emailFormat = z.email();

const fullNameSchema = z
  .string({ error: text.nameRequired })
  .transform((value) => value.trim().replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(1, { error: text.nameRequired })
      .max(MAX_NAME_LENGTH, { error: text.nameTooLong(MAX_NAME_LENGTH) })
      .refine((name) => normalizeName(name) !== "", { error: text.nameRequired }),
  );

/** Teléfono: se guarda tal cual viene (sin validar el formato); vacío = sin dato. */
const phoneSchema = z
  .string()
  .trim()
  .max(MAX_PHONE_LENGTH, { error: text.phoneTooLong(MAX_PHONE_LENGTH) })
  .transform((value) => value || null);

/** Correo: en minúsculas y con formato válido; vacío = sin dato. */
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(MAX_EMAIL_LENGTH, { error: text.invalidEmail })
  .refine((value) => value === "" || emailFormat.safeParse(value).success, {
    error: text.invalidEmail,
  })
  .transform((value) => value || null);

/** Una fila del padrón ya validada. */
export const memberCsvRowSchema = z.object({
  uuid: churchUuidSchema,
  fullName: fullNameSchema,
  phone: phoneSchema,
  email: emailSchema,
});

export type MemberCsvRowData = z.infer<typeof memberCsvRowSchema>;

export interface MemberCsvRow extends MemberCsvRowData {
  /** Línea del archivo (para informar errores). */
  line: number;
}

/**
 * Problema encontrado. Nunca incluye datos de la persona (ni nombre, ni uuid, ni contactos):
 * solo la línea del archivo y la columna. `line: null` es un problema de todo el archivo.
 */
export interface MemberCsvIssue {
  line: number | null;
  column: MemberCsvColumn | null;
  message: string;
}

export interface MemberCsvParseResult {
  /** Filas válidas y sin identificador repetido, listas para importar. */
  rows: MemberCsvRow[];
  issues: MemberCsvIssue[];
  /**
   * Identificadores válidos que figuran en el archivo, aunque su fila se haya descartado por otro
   * error. La importación no debe dar de baja a nadie de esta lista.
   */
  presentUuids: ReadonlySet<string>;
  /** Filas de datos leídas (sin contar el encabezado ni las líneas vacías). */
  totalRows: number;
  /** `true` si el problema es de todo el archivo (columnas, formato, tamaño): no se puede importar nada. */
  blocked: boolean;
}

type HeaderIndex = Record<MemberCsvColumn, number>;

function blockedResult(message: string): MemberCsvParseResult {
  return {
    rows: [],
    issues: [{ line: null, column: null, message }],
    presentUuids: new Set(),
    totalRows: 0,
    blocked: true,
  };
}

function isBlank(record: CsvRecord): boolean {
  return record.fields.length === 1 && (record.fields[0] ?? "").trim() === "";
}

/** Busca las columnas por nombre (sin importar mayúsculas ni espacios); las que sobran se ignoran. */
function readHeader(fields: readonly string[]): { index: HeaderIndex } | { error: string } {
  const normalized = fields.map((field) => field.trim().toLowerCase());
  const duplicated = MEMBER_CSV_COLUMNS.filter(
    (column) => normalized.filter((name) => name === column.toLowerCase()).length > 1,
  );
  if (duplicated.length > 0) return { error: text.duplicateColumns(duplicated) };
  const missing = MEMBER_CSV_COLUMNS.filter((column) => !normalized.includes(column.toLowerCase()));
  if (missing.length > 0) return { error: text.missingColumns(missing) };
  const index = Object.fromEntries(
    MEMBER_CSV_COLUMNS.map((column) => [column, normalized.indexOf(column.toLowerCase())]),
  ) as HeaderIndex;
  return { index };
}

function rawRow(fields: readonly string[], index: HeaderIndex): Record<MemberCsvColumn, string> {
  return Object.fromEntries(
    MEMBER_CSV_COLUMNS.map((column) => [column, fields[index[column]] ?? ""]),
  ) as Record<MemberCsvColumn, string>;
}

function isColumn(value: unknown): value is MemberCsvColumn {
  return typeof value === "string" && (MEMBER_CSV_COLUMNS as readonly string[]).includes(value);
}

/** Un problema por columna: el primero que informa Zod, sin el valor recibido. */
function rowIssues(line: number, error: z.ZodError): MemberCsvIssue[] {
  const byColumn = new Map<MemberCsvColumn, MemberCsvIssue>();
  for (const issue of error.issues) {
    const column = issue.path[0];
    if (isColumn(column) && !byColumn.has(column))
      byColumn.set(column, { line, column, message: issue.message });
  }
  return [...byColumn.values()];
}

/** Por línea y, dentro de la línea, en el orden de las columnas (los problemas sin columna van primero). */
function compareIssues(a: MemberCsvIssue, b: MemberCsvIssue): number {
  const columnOrder = (issue: MemberCsvIssue): number =>
    issue.column === null ? -1 : MEMBER_CSV_COLUMNS.indexOf(issue.column);
  return (a.line ?? 0) - (b.line ?? 0) || columnOrder(a) - columnOrder(b);
}

/**
 * Lee y valida el CSV del padrón (`uuid`, `fullName`, `phone`, `email`): lo parte en filas, comprueba
 * las columnas obligatorias, valida cada fila y detecta identificadores repetidos. Las filas con
 * errores se informan y se dejan afuera; el resto queda en `rows`. Un identificador repetido
 * descarta todas sus filas, porque no se sabe cuál es la correcta.
 */
export function parseMemberCsv(content: string): MemberCsvParseResult {
  let records: CsvRecord[];
  try {
    records = parseCsv(content).filter((record) => !isBlank(record));
  } catch (error) {
    if (error instanceof CsvParseError) return blockedResult(text.unreadable(error.line));
    throw error;
  }
  const [headerRecord, ...dataRecords] = records;
  if (headerRecord === undefined) return blockedResult(text.emptyFile);
  const header = readHeader(headerRecord.fields);
  if ("error" in header) return blockedResult(header.error);
  if (dataRecords.length > MAX_IMPORT_ROWS) return blockedResult(text.tooManyRows(MAX_IMPORT_ROWS));

  const issues: MemberCsvIssue[] = [];
  const candidates: MemberCsvRow[] = [];
  const linesByUuid = new Map<string, number[]>();

  for (const record of dataRecords) {
    if (record.fields.length !== headerRecord.fields.length) {
      issues.push({
        line: record.line,
        column: null,
        message: text.wrongColumnCount(headerRecord.fields.length, record.fields.length),
      });
      continue;
    }
    const raw = rawRow(record.fields, header.index);
    const uuid = churchUuidSchema.safeParse(raw.uuid);
    if (uuid.success)
      linesByUuid.set(uuid.data, [...(linesByUuid.get(uuid.data) ?? []), record.line]);
    const parsed = memberCsvRowSchema.safeParse(raw);
    if (parsed.success) candidates.push({ line: record.line, ...parsed.data });
    else issues.push(...rowIssues(record.line, parsed.error));
  }

  const repeated = new Map([...linesByUuid].filter(([, lines]) => lines.length > 1));
  for (const lines of repeated.values()) {
    for (const line of lines)
      issues.push({ line, column: "uuid", message: text.duplicateUuid(lines) });
  }
  const rows = candidates.filter((row) => !repeated.has(row.uuid));
  issues.sort(compareIssues);

  return {
    rows,
    issues,
    presentUuids: new Set(linesByUuid.keys()),
    totalRows: dataRecords.length,
    blocked: false,
  };
}

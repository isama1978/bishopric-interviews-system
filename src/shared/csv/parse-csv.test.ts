import { describe, expect, it } from "vitest";
import { CsvParseError, parseCsv } from "./parse-csv";

const fields = (input: string) => parseCsv(input).map((record) => record.fields);

describe("parseCsv", () => {
  it("lee filas simples, con o sin salto de línea final", () => {
    expect(fields("a,b,c\n1,2,3\n")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
    expect(fields("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("acepta \\r\\n, \\n y \\r como fin de línea", () => {
    expect(fields("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(fields("a,b\r1,2\r")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(fields("a,b\n\n1,2\n")).toEqual([["a", "b"], [""], ["1", "2"]]);
  });

  it("campos entre comillas: con comas, comillas escapadas y saltos de línea", () => {
    expect(fields('"Pérez, Ana","dijo ""hola""","línea 1\nlínea 2"\n')).toEqual([
      ["Pérez, Ana", 'dijo "hola"', "línea 1\nlínea 2"],
    ]);
  });

  it("conserva los espacios y las tildes, y los campos vacíos al principio, en medio y al final", () => {
    expect(fields(" a ,,ñ,\n,,\n")).toEqual([
      [" a ", "", "ñ", ""],
      ["", "", ""],
    ]);
    expect(fields('"",x')).toEqual([["", "x"]]);
  });

  it("ignora la marca BOM del comienzo", () => {
    expect(fields("\uFEFFuuid,fullName\n1,Ana\n")).toEqual([
      ["uuid", "fullName"],
      ["1", "Ana"],
    ]);
  });

  it("registra la línea donde empieza cada fila, aun con saltos dentro de comillas", () => {
    const lines = parseCsv('a,b\n"x\ny",2\n\nc,d\n').map((record) => record.line);
    expect(lines).toEqual([1, 2, 4, 5]);
  });

  it("archivo vacío da cero filas", () => {
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv("\uFEFF")).toEqual([]);
  });

  it("lanza error con comillas sin cerrar, indicando la línea donde empezó el campo", () => {
    expect(() => parseCsv('a,b\n1,"sin cerrar\n3,4\n')).toThrow(CsvParseError);
    try {
      parseCsv('a,b\n1,"sin cerrar\n3,4\n');
    } catch (error) {
      expect((error as CsvParseError).line).toBe(2);
    }
  });

  it("lanza error si hay texto entre la comilla de cierre y la coma", () => {
    expect(() => parseCsv('"abc"x,1\n')).toThrow(CsvParseError);
    expect(() => parseCsv('1,"abc" ,2\n')).toThrow(CsvParseError);
  });

  it("una comilla en medio de un campo sin comillas se toma como texto", () => {
    expect(fields('5" pantalla,x\n')).toEqual([['5" pantalla', "x"]]);
  });
});

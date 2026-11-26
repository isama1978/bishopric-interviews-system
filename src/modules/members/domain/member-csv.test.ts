import { describe, expect, it } from "vitest";
import { MAX_IMPORT_ROWS } from "@/shared/constants/import.constants";
import { messages } from "@/shared/messages/messages.es";
import { parseMemberCsv } from "./member-csv";

// Todos los datos son inventados.
const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";
const U3 = "33333333-3333-4333-8333-333333333333";
const HEADER = "uuid,fullName,phone,email";
const csv = (...lines: string[]) => [HEADER, ...lines].join("\n") + "\n";

describe("parseMemberCsv: lectura y normalización", () => {
  it("lee las filas válidas con su línea", () => {
    const result = parseMemberCsv(
      csv(`${U1},Ana Pérez,+54 9 351 000-0001,ana@example.com`, `${U2},Luis Gómez,,`),
    );
    expect(result.blocked).toBe(false);
    expect(result.issues).toEqual([]);
    expect(result.totalRows).toBe(2);
    expect(result.rows).toEqual([
      {
        line: 2,
        uuid: U1,
        fullName: "Ana Pérez",
        phone: "+54 9 351 000-0001",
        email: "ana@example.com",
      },
      { line: 3, uuid: U2, fullName: "Luis Gómez", phone: null, email: null },
    ]);
    expect([...result.presentUuids].sort()).toEqual([U1, U2]);
  });

  it("normaliza: uuid y correo en minúsculas, nombre sin espacios de más, vacíos como null", () => {
    const upper = U1.toUpperCase();
    const result = parseMemberCsv(csv(`${upper},  Ana   Pérez  ,  , Ana@Example.COM `));
    expect(result.rows[0]).toMatchObject({
      uuid: U1,
      fullName: "Ana Pérez",
      phone: null,
      email: "ana@example.com",
    });
  });

  it("encuentra las columnas por nombre: en cualquier orden, sin importar mayúsculas, e ignora las que sobran", () => {
    const content = `Email, FULLNAME ,birthDate,UUID,phone\nana@example.com,Ana Pérez,1990-01-01,${U1},123\n`;
    const result = parseMemberCsv(content);
    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      { line: 2, uuid: U1, fullName: "Ana Pérez", phone: "123", email: "ana@example.com" },
    ]);
    expect(JSON.stringify(result)).not.toContain("1990"); // los datos de columnas ajenas se descartan
  });

  it("acepta nombres con comas entre comillas, BOM, \\r\\n y líneas vacías", () => {
    const content = `\uFEFF${HEADER}\r\n\r\n${U1},"Pérez, Ana",,\r\n\r\n`;
    const result = parseMemberCsv(content);
    expect(result.issues).toEqual([]);
    expect(result.rows[0]).toMatchObject({ fullName: "Pérez, Ana" });
  });

  it("un encabezado sin filas no es un error del archivo", () => {
    const result = parseMemberCsv(`${HEADER}\n`);
    expect(result).toMatchObject({ rows: [], issues: [], totalRows: 0, blocked: false });
  });
});

describe("parseMemberCsv: problemas del archivo (bloquean todo)", () => {
  it("archivo vacío o con solo líneas en blanco", () => {
    for (const content of ["", "\n\n  \n"]) {
      const result = parseMemberCsv(content);
      expect(result.blocked).toBe(true);
      expect(result.issues).toEqual([
        { line: null, column: null, message: messages.memberImport.emptyFile },
      ]);
    }
  });

  it("faltan columnas obligatorias", () => {
    const result = parseMemberCsv("uuid,fullName\n1,Ana\n");
    expect(result.blocked).toBe(true);
    expect(result.issues[0]?.message).toBe(
      messages.memberImport.missingColumns(["phone", "email"]),
    );
    expect(result.rows).toEqual([]);
  });

  it("columnas repetidas", () => {
    const result = parseMemberCsv("uuid,fullName,phone,email,PHONE\n");
    expect(result.blocked).toBe(true);
    expect(result.issues[0]?.message).toBe(messages.memberImport.duplicateColumns(["phone"]));
  });

  it("formato CSV roto (comillas sin cerrar)", () => {
    const result = parseMemberCsv(csv(`${U1},"Ana Pérez,,`));
    expect(result.blocked).toBe(true);
    expect(result.issues[0]?.message).toBe(messages.memberImport.unreadable(2));
  });

  it("demasiadas filas", () => {
    const rows = Array.from(
      { length: MAX_IMPORT_ROWS + 1 },
      (_, i) => `${U1.slice(0, 24)}${String(i).padStart(12, "0")},Persona ${i},,`,
    );
    const result = parseMemberCsv(csv(...rows));
    expect(result.blocked).toBe(true);
    expect(result.issues[0]?.message).toBe(messages.memberImport.tooManyRows(MAX_IMPORT_ROWS));
  });
});

describe("parseMemberCsv: problemas por fila (esa fila se descarta, el resto sigue)", () => {
  it("uuid inválido, nombre vacío, correo mal escrito y teléfono demasiado largo", () => {
    const result = parseMemberCsv(
      csv(
        `no-es-uuid,Ana Pérez,,`,
        `${U1},   ,,`,
        `${U2},Luis Gómez,,esto-no-es-un-correo`,
        `${U3},Marta Díaz,${"9".repeat(60)},`,
        `44444444-4444-4444-8444-444444444444,Pedro Ruiz,,pedro@example.com`,
      ),
    );
    expect(result.blocked).toBe(false);
    expect(result.rows.map((row) => row.fullName)).toEqual(["Pedro Ruiz"]);
    expect(result.issues).toEqual([
      { line: 2, column: "uuid", message: messages.validation.invalidUuid },
      { line: 3, column: "fullName", message: messages.memberImport.nameRequired },
      { line: 4, column: "email", message: messages.memberImport.invalidEmail },
      { line: 5, column: "phone", message: messages.memberImport.phoneTooLong(40) },
    ]);
  });

  it("una coma sin comillas en el nombre desplaza las columnas: la fila se informa y no se importa", () => {
    const result = parseMemberCsv(csv(`${U1},Pérez, Ana,,`, `${U2},Luis Gómez,,`));
    expect(result.issues).toEqual([
      { line: 2, column: null, message: messages.memberImport.wrongColumnCount(4, 5) },
    ]);
    expect(result.rows.map((row) => row.uuid)).toEqual([U2]);
    expect(result.presentUuids.has(U1)).toBe(false); // no se pudo leer con seguridad
  });

  it("una fila con varios errores informa uno por columna", () => {
    const result = parseMemberCsv(csv(`no-es-uuid,,,mal-correo`));
    expect(result.issues.map((issue) => issue.column)).toEqual(["uuid", "fullName", "email"]);
  });

  it("los mensajes nunca incluyen datos de la persona", () => {
    const secrets = ["Ana Pérez", "mal-correo-ana", "no-es-uuid-ana", "351 000-9999"];
    const result = parseMemberCsv(
      csv(
        `no-es-uuid-ana,Ana Pérez,351 000-9999${"1".repeat(40)},mal-correo-ana`,
        `${U1},Ana Pérez,,`,
        `${U1},Ana Pérez,,`,
      ),
    );
    expect(result.issues.length).toBeGreaterThan(0);
    const dump = JSON.stringify(result.issues);
    for (const secret of secrets) expect(dump).not.toContain(secret);
    expect(dump).not.toContain(U1);
  });
});

describe("parseMemberCsv: identificadores repetidos", () => {
  it("descarta todas las filas de un uuid repetido (aunque difieran en mayúsculas) e informa las líneas", () => {
    const result = parseMemberCsv(
      csv(`${U1},Ana Pérez,,`, `${U2},Luis Gómez,,`, `${U1.toUpperCase()},Ana P.,,`),
    );
    expect(result.rows.map((row) => row.uuid)).toEqual([U2]);
    expect(result.issues).toEqual([
      { line: 2, column: "uuid", message: messages.memberImport.duplicateUuid([2, 4]) },
      { line: 4, column: "uuid", message: messages.memberImport.duplicateUuid([2, 4]) },
    ]);
    expect(result.presentUuids.has(U1)).toBe(true);
  });

  it("un uuid repetido en una fila válida y otra con otro error también se descarta", () => {
    const result = parseMemberCsv(csv(`${U1},Ana Pérez,,`, `${U1},Ana Pérez,,correo-malo`));
    expect(result.rows).toEqual([]);
    expect(result.issues.map((issue) => `${issue.line}:${issue.column}`)).toEqual([
      "2:uuid",
      "3:uuid",
      "3:email",
    ]);
  });

  it("una fila válida en uuid pero con otro error sigue figurando como presente (no se da de baja)", () => {
    const result = parseMemberCsv(csv(`${U1},Ana Pérez,,correo-malo`, `${U2},Luis Gómez,,`));
    expect(result.rows.map((row) => row.uuid)).toEqual([U2]);
    expect([...result.presentUuids].sort()).toEqual([U1, U2]);
  });

  it("un uuid inválido no figura como presente", () => {
    expect(parseMemberCsv(csv(`xxx,Ana Pérez,,`)).presentUuids.size).toBe(0);
  });
});

describe("parseMemberCsv: tamaño real", () => {
  it("procesa 469 filas con un 58% sin teléfono y un 71% sin correo", () => {
    const rows = Array.from({ length: 469 }, (_, i) => {
      const uuid = `aaaaaaaa-aaaa-4aaa-8aaa-${String(i).padStart(12, "0")}`;
      const phone = i % 100 < 42 ? `+54 9 351 555-${String(i).padStart(4, "0")}` : "";
      const email = i % 100 < 29 ? `persona${i}@example.com` : "";
      return `${uuid},Persona Número ${i},${phone},${email}`;
    });
    const started = Date.now();
    const result = parseMemberCsv(csv(...rows));
    expect(Date.now() - started).toBeLessThan(1000);
    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(469);
    expect(result.rows.filter((row) => row.phone === null).length).toBeGreaterThan(250);
    expect(result.presentUuids.size).toBe(469);
  });
});

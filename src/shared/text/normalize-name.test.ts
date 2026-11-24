import { describe, expect, it } from "vitest";
import { normalizeName } from "./normalize-name";

describe("normalizeName", () => {
  it("quita acentos y pasa a minúsculas", () => {
    expect(normalizeName("José Pérez")).toBe("jose perez");
    expect(normalizeName("ÁÉÍÓÚ Üü")).toBe("aeiou uu");
  });

  it("trata la ñ como n: «Muñoz» y «Munoz» coinciden", () => {
    expect(normalizeName("Muñoz")).toBe("munoz");
    expect(normalizeName("MUÑOZ")).toBe(normalizeName("Munoz"));
    expect(normalizeName("Ñandú")).toBe("nandu");
  });

  it("convierte los guiones en espacios, incluidas sus variantes", () => {
    expect(normalizeName("María-José")).toBe("maria jose");
    expect(normalizeName("Ana–María")).toBe("ana maria"); // guion medio
    expect(normalizeName("Ana—María")).toBe("ana maria"); // guion largo
    expect(normalizeName("Ana - María")).toBe("ana maria");
    expect(normalizeName("Jean-Paul")).toBe(normalizeName("Jean Paul"));
  });

  it("quita el resto de la puntuación sin separar palabras", () => {
    expect(normalizeName("O'Brien")).toBe("obrien");
    expect(normalizeName("O’Brien")).toBe("obrien"); // apóstrofe tipográfico
    expect(normalizeName("D'Angelo")).toBe("dangelo");
    expect(normalizeName("Dr. José Luis")).toBe("dr jose luis");
    expect(normalizeName("Juan (Pérez)")).toBe("juan perez");
    expect(normalizeName("Juan 😀 Pérez")).toBe("juan perez");
  });

  it("deja espacios simples y sin bordes, también con tabulaciones, saltos y espacios raros", () => {
    expect(normalizeName("  Juan   Carlos\tGómez\n")).toBe("juan carlos gomez");
    expect(normalizeName("Juan\u00a0Pérez\u200b")).toBe("juan perez"); // espacio duro y ancho cero
  });

  it("da lo mismo con la letra compuesta o descompuesta", () => {
    expect(normalizeName("Jose\u0301")).toBe(normalizeName("José"));
  });

  it("resuelve letras que Unicode no descompone, ligaduras y ancho completo", () => {
    expect(normalizeName("Łukasz Müller Straße Øster")).toBe("lukasz muller strasse oster");
    expect(normalizeName("Đorđe")).toBe("dorde");
    expect(normalizeName("ﬁnn")).toBe("finn");
    expect(normalizeName("Ｊｕａｎ")).toBe("juan");
  });

  it("conserva números y letras de otros alfabetos", () => {
    expect(normalizeName("Juan 2")).toBe("juan 2");
    expect(normalizeName("Иван")).toBe("иван");
  });

  it("devuelve vacío si no queda nada", () => {
    for (const empty of ["", "   ", "-", "...", "---  ...", "😀"]) {
      expect(normalizeName(empty), empty).toBe("");
    }
  });

  it("es idempotente", () => {
    const samples = ["María-José O'Brien", "  Muñoz  ", "Łukasz", "Jean - Paul", "Ｊｕａｎ"];
    for (const sample of samples) {
      expect(normalizeName(normalizeName(sample)), sample).toBe(normalizeName(sample));
    }
  });

  it("lo escrito en el buscador coincide con lo guardado", () => {
    const stored = normalizeName("María-José Muñoz Pérez");
    expect(stored.includes(normalizeName("MUNOZ"))).toBe(true);
    expect(stored.includes(normalizeName("josé"))).toBe(true);
    expect(stored.startsWith(normalizeName("Maria"))).toBe(true);
  });
});

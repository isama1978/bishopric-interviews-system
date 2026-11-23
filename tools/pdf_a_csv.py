"""
Convierte el listado de miembros (PDF impreso desde el sitio) en un CSV de importación.

Uso:
    pip install pdfplumber
    python pdf_a_csv.py lista.pdf padron.csv --esperados 469
    python pdf_a_csv.py lista.pdf --diagnostico     (solo estructura, sin datos)
    python pdf_a_csv.py lista.pdf padron.csv --filas-por-texto   (si no hay líneas entre filas)

El programa se ejecuta de forma local. No envía nada por red.
Columnas de salida: fullName, birthDate (AAAA-MM-DD), phone, email.
Se descartan Sexo y Edad: el sistema no los necesita.
La fecha de nacimiento se usa solo para generar una clave de identificación
al importar; el sistema no la guarda.

Cómo lee el PDF: en cada página busca el encabezado (cada página lo repite), toma
la posición horizontal de cada columna y usa las líneas horizontales como separadores
de filas. Así no depende de que las filas tengan fondo coloreado.
"""

import argparse
import csv
import re
import sys
import unicodedata
from collections import Counter
from datetime import date

import pdfplumber

CAMPOS_SALIDA = ["fullName", "birthDate", "phone", "email"]

# Texto del encabezado del PDF (normalizado) -> campo de salida
ENCABEZADOS = {
    "nombre": "fullName",
    "fecha de nacimiento": "birthDate",
    "numero de telefono": "phone",
    "correo electronico": "email",
}

# Primera palabra de cada encabezado, en el orden en que aparecen en el PDF
PALABRAS_ENCABEZADO = ["nombre", "sexo", "edad", "fecha", "numero", "correo"]

MESES = {
    "ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6,
    "jul": 7, "ago": 8, "sep": 9, "set": 9, "oct": 10, "nov": 11, "dic": 12,
}

# Para PDFs en los que no se encuentra el encabezado por posición
AJUSTES_TEXTO = {"vertical_strategy": "text", "horizontal_strategy": "text"}

MARGEN_COLUMNA = 4          # puntos a la izquierda del inicio de cada encabezado
MARGEN_DERECHO = 2          # puntos a la derecha del texto de la última columna
TOLERANCIA_INTERSECCION = 15  # puntos de diferencia tolerados entre las verticales y el final de las líneas
TOLERANCIA_VERTICAL = 25    # puntos de diferencia máxima entre palabras del encabezado


def normalizar(texto):
    sin_acentos = (
        unicodedata.normalize("NFKD", texto or "").encode("ascii", "ignore").decode()
    )
    return re.sub(r"\s+", " ", sin_acentos).strip().lower()


def limpiar(celda):
    return re.sub(r"\s+", " ", celda or "").strip()


def parsear_fecha(texto):
    t = normalizar(texto)
    if not t:
        return ""
    numerica = re.fullmatch(r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})", t)
    if numerica:
        dia, mes, anio = (int(valor) for valor in numerica.groups())
    else:
        textual = re.search(r"(\d{1,2})\s*(?:de\s+)?([a-z]+)\.?\s*(?:de\s+)?(\d{4})", t)
        if not textual:
            return ""
        dia, anio = int(textual.group(1)), int(textual.group(3))
        mes = MESES.get(textual.group(2)[:3], 0)
    try:
        return date(anio, mes, dia).isoformat()
    except ValueError:
        return ""


def mapear_encabezado(fila):
    """Devuelve {campo: índice de columna} si la fila es un encabezado, o None."""
    mapa = {}
    for indice, celda in enumerate(fila):
        campo = ENCABEZADOS.get(normalizar(celda))
        if campo:
            mapa[campo] = indice
    return mapa if "fullName" in mapa else None


def valor(celdas, mapa, campo):
    indice = mapa.get(campo)
    if indice is None or indice >= len(celdas):
        return ""
    return celdas[indice]


def construir_registro(celdas, mapa):
    nombre = valor(celdas, mapa, "fullName")
    if not nombre:
        return None
    return {
        "fullName": nombre,
        "birthDate": parsear_fecha(valor(celdas, mapa, "birthDate")),
        "phone": valor(celdas, mapa, "phone"),
        "email": valor(celdas, mapa, "email").lower(),
    }


def posiciones_columnas(pagina):
    """Posición horizontal (x0) de cada columna según el encabezado de la página."""
    palabras = pagina.extract_words()
    ancla = next((p for p in palabras if normalizar(p["text"]) == "nombre"), None)
    if ancla is None:
        return None
    posiciones = {}
    for palabra in palabras:
        clave = normalizar(palabra["text"])
        cerca = abs(palabra["top"] - ancla["top"]) <= TOLERANCIA_VERTICAL
        if clave in PALABRAS_ENCABEZADO and cerca and clave not in posiciones:
            posiciones[clave] = palabra["x0"]
    if len(posiciones) < len(PALABRAS_ENCABEZADO):
        return None
    columnas = [posiciones[clave] for clave in PALABRAS_ENCABEZADO]
    return columnas if columnas == sorted(columnas) else None


def limites_tabla(pagina, columnas):
    """Límites laterales calculados con el texto de la primera y la última columna.

    No se usan las líneas dibujadas: en algunas páginas vienen partidas en tramos
    cortos por celda y no sirven para medir el ancho de la tabla.
    """
    palabras = pagina.extract_words()
    izquierda = columnas[0] - MARGEN_COLUMNA
    finales = [p["x1"] for p in palabras if p["x0"] >= columnas[-1] - MARGEN_COLUMNA]
    derecha = max(finales) + MARGEN_DERECHO
    return izquierda, derecha


def fin_de_lineas(pagina):
    """Extremo derecho más repetido entre las líneas horizontales (dato informativo)."""
    conteo = Counter(round(borde["x1"]) for borde in pagina.horizontal_edges)
    repetidos = [x for x, cantidad in conteo.items() if cantidad >= 5]
    return max(repetidos) if repetidos else None


def ajustes_por_columnas(pagina, columnas, filas_por_texto):
    izquierda, derecha = limites_tabla(pagina, columnas)
    internas = [max(x - MARGEN_COLUMNA, izquierda) for x in columnas[1:]]
    verticales = [izquierda] + internas + [derecha]
    return {
        "vertical_strategy": "explicit",
        "explicit_vertical_lines": verticales,
        "horizontal_strategy": "text" if filas_por_texto else "lines",
        "intersection_x_tolerance": TOLERANCIA_INTERSECCION,
    }


def tablas_de_pagina(pagina, filas_por_texto=False):
    columnas = posiciones_columnas(pagina)
    if columnas is None:
        return pagina.extract_tables() or pagina.extract_tables(AJUSTES_TEXTO)
    return pagina.extract_tables(ajustes_por_columnas(pagina, columnas, filas_por_texto))


def procesar_tabla(tabla, mapa_actual, registros):
    for fila in tabla:
        celdas = [limpiar(celda) for celda in fila]
        encabezado = mapear_encabezado(celdas)
        if encabezado:
            mapa_actual = encabezado
            continue
        if mapa_actual is None:
            continue
        registro = construir_registro(celdas, mapa_actual)
        if registro:
            registros.append(registro)
    return mapa_actual


def extraer_registros(ruta_pdf, filas_por_texto=False):
    registros, por_pagina = [], []
    mapa_actual = None
    with pdfplumber.open(ruta_pdf) as pdf:
        for pagina in pdf.pages:
            antes = len(registros)
            for tabla in tablas_de_pagina(pagina, filas_por_texto):
                mapa_actual = procesar_tabla(tabla, mapa_actual, registros)
            por_pagina.append(len(registros) - antes)
    return registros, por_pagina


def informar(registros, por_pagina, esperados):
    """Resumen sin nombres ni datos personales."""
    duplicados = Counter((r["fullName"], r["birthDate"]) for r in registros)
    repetidos = sum(1 for cantidad in duplicados.values() if cantidad > 1)
    print(f"Filas exportadas: {len(registros)}")
    print(f"Filas por página: {por_pagina}")
    print(f"Sin fecha de nacimiento válida: {sum(1 for r in registros if not r['birthDate'])}")
    print(f"Sin teléfono: {sum(1 for r in registros if not r['phone'])}")
    print(f"Sin correo: {sum(1 for r in registros if not r['email'])}")
    print(f"Combinaciones nombre + fecha repetidas: {repetidos}")
    if esperados is not None and esperados != len(registros):
        print(f"ATENCIÓN: se esperaban {esperados} filas y se exportaron {len(registros)}.")


def diagnosticar(ruta_pdf, filas_por_texto):
    """Muestra solo estructura (números y encabezados), sin datos de miembros."""
    with pdfplumber.open(ruta_pdf) as pdf:
        print(f"Páginas: {len(pdf.pages)}")
        for numero, pagina in enumerate(pdf.pages[:2], start=1):
            columnas = posiciones_columnas(pagina)
            if columnas:
                print(f"Página {numero}: columnas en x = {[round(x) for x in columnas]}")
            else:
                print(f"Página {numero}: no se encontró el encabezado por posición")
            print(f"  Líneas horizontales detectadas: {len(pagina.horizontal_edges)}")
            if columnas:
                izquierda, derecha = limites_tabla(pagina, columnas)
                print(f"  Límites de la tabla: x = {round(izquierda)} a {round(derecha)} (ancho de página {round(pagina.width)})")
                print(f"  Final de las líneas horizontales (más repetido): x = {fin_de_lineas(pagina)}")
            tablas = tablas_de_pagina(pagina, filas_por_texto)
            print(f"  Tablas: {len(tablas)}; filas por tabla: {[len(t) for t in tablas]}")
            for tabla in tablas[:1]:
                filas = [[limpiar(celda) for celda in fila] for fila in tabla]
                indice = next((i for i, f in enumerate(filas) if mapear_encabezado(f)), None)
                print(f"  Fila del encabezado: {indice}")
                print(f"  Celdas por fila: {dict(Counter(len(f) for f in filas))}")
                print(f"  Filas con la primera celda vacía: {sum(1 for f in filas if not f[0])}")
                if indice is not None:
                    print(f"  Encabezado: {filas[indice]}")


def escribir_csv(registros, ruta_csv):
    with open(ruta_csv, "w", newline="", encoding="utf-8") as archivo:
        escritor = csv.DictWriter(archivo, fieldnames=CAMPOS_SALIDA)
        escritor.writeheader()
        escritor.writerows(registros)


def main():
    parser = argparse.ArgumentParser(description="PDF de miembros a CSV de importación")
    parser.add_argument("pdf")
    parser.add_argument("csv", nargs="?")
    parser.add_argument("--diagnostico", action="store_true")
    parser.add_argument("--filas-por-texto", action="store_true")
    parser.add_argument("--esperados", type=int, default=None)
    args = parser.parse_args()

    if args.diagnostico:
        diagnosticar(args.pdf, args.filas_por_texto)
        return
    if not args.csv:
        parser.error("Falta la ruta del CSV de salida")

    registros, por_pagina = extraer_registros(args.pdf, args.filas_por_texto)
    if not registros:
        sys.exit("No se extrajo ninguna fila. Probá con --diagnostico.")
    escribir_csv(registros, args.csv)
    informar(registros, por_pagina, args.esperados)
    print("Recordá borrar el PDF y el CSV del equipo después de importar.")


if __name__ == "__main__":
    main()

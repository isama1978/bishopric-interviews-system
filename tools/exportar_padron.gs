// Exportador del padrón de miembros (uuid, nombre, teléfono, correo) a una hoja de cálculo.
// Usa la llamada que hace la propia página (una Server Action de Next.js: POST con la cabecera Next-Action,
// respuesta en líneas «id:JSON»). Requiere que guardarCookies() haya guardado COOKIE_HEADER con cookies vigentes.
// Nunca se imprimen datos de miembros en el registro: solo cantidades y nombres de claves.

const ORIGEN = "https://lcr.churchofjesuschrist.org";
const URL_MIEMBROS = ORIGEN + "/mlt/records/member-list?lang=spa";

// Identificador de la acción: cambia cuando el sitio publica una versión nueva.
// Si deja de funcionar, copiar el valor actual de la cabecera next-action de la petición.
const ID_ACCION = "60b4475224cfad77f02ac5fdf6623b6350aa677b4d";

// Cuerpo de la petición: pestaña Payload de la misma petición en DevTools (unos 20 caracteres).
// IMPORTANTE: debe ir entre comillas SIMPLES, como texto. Ejemplo de forma: const CUERPO_ACCION = '[...]';
const CUERPO_ACCION = "PEGAR_EL_PAYLOAD";

const ARBOL_ROUTER =
  "%5B%22%22%2C%7B%22children%22%3A%5B%22records%22%2C%7B%22children%22%3A%5B%22member-list%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%2C0%5D%7D%2Cnull%2Cnull%2C0%5D%7D%2Cnull%2Cnull%2C0%5D%7D%2Cnull%2Cnull%2C20%5D";

const HOJA_PADRON = "Padron";
const PROFUNDIDAD_MAXIMA = 6;

// Muestra solo los nombres de las cookies guardadas y su largo, nunca los valores.
function mostrarCookiesGuardadas() {
  const cookie = PropertiesService.getScriptProperties().getProperty("COOKIE_HEADER") || "";
  const nombres = cookie
    .split(";")
    .map((par) => par.trim().split("=")[0])
    .filter(Boolean);
  Logger.log("Cookies guardadas: " + nombres.join(", "));
  Logger.log("Largo total: " + cookie.length);
}

function pedirListaRsc() {
  const cookie = PropertiesService.getScriptProperties().getProperty("COOKIE_HEADER");
  return UrlFetchApp.fetch(URL_MIEMBROS, {
    method: "post",
    contentType: "text/plain;charset=UTF-8",
    payload: CUERPO_ACCION,
    headers: {
      Accept: "text/x-component",
      Cookie: cookie,
      "Next-Action": ID_ACCION,
      "Next-Router-State-Tree": ARBOL_ROUTER,
      Origin: ORIGEN,
      Referer: ORIGEN + "/",
    },
    muteHttpExceptions: true,
    followRedirects: false,
  });
}

// Cada línea de la respuesta tiene la forma «<id>:<JSON>». Se interpreta cada una por separado.
function parsearFilasRsc(texto) {
  return texto
    .split("\n")
    .map((linea) => {
      const separador = linea.indexOf(":");
      if (separador === -1) return null;
      try {
        return JSON.parse(linea.substring(separador + 1));
      } catch (error) {
        return null;
      }
    })
    .filter((fila) => fila !== null);
}

// Busca, dentro de las filas interpretadas, el objeto que contiene el arreglo «members».
function buscarMiembros(valor, profundidad) {
  if (!valor || typeof valor !== "object" || profundidad > PROFUNDIDAD_MAXIMA) return null;
  if (Array.isArray(valor.members)) return valor.members;
  const hijos = Array.isArray(valor) ? valor : Object.values(valor);
  for (const hijo of hijos) {
    const encontrados = buscarMiembros(hijo, profundidad + 1);
    if (encontrados) return encontrados;
  }
  return null;
}

// Cuenta cuántos miembros tienen cada clave (y las subclaves de un nivel).
function contarClaves(miembros) {
  const conteo = {};
  const sumar = (clave) => {
    conteo[clave] = (conteo[clave] || 0) + 1;
  };
  miembros.forEach((miembro) => {
    Object.keys(miembro).forEach((clave) => {
      sumar(clave);
      const valor = miembro[clave];
      if (valor && typeof valor === "object" && !Array.isArray(valor)) {
        Object.keys(valor).forEach((subclave) => sumar(clave + "." + subclave));
      }
    });
  });
  return conteo;
}

// En una redirección, muestra solo la ruta de destino (sin parámetros).
function describirRedireccion(response) {
  const cabeceras = response.getHeaders();
  const ubicacion = cabeceras["Location"] || cabeceras["location"];
  return ubicacion ? ubicacion.split("?")[0] : "sin cabecera Location";
}

function obtenerMiembros() {
  if (typeof CUERPO_ACCION !== "string") {
    Logger.log("CUERPO_ACCION debe ser texto: ponelo entre comillas simples.");
    return null;
  }
  if (CUERPO_ACCION.indexOf("PEGAR") !== -1) {
    Logger.log("Falta completar CUERPO_ACCION con el Payload de la petición.");
    return null;
  }
  const response = pedirListaRsc();
  const codigo = response.getResponseCode();
  Logger.log("Código: " + codigo);
  Logger.log("Content-Type: " + response.getHeaders()["Content-Type"]);
  if (codigo >= 300 && codigo < 400) {
    Logger.log("Redirección a: " + describirRedireccion(response));
  }
  if (codigo !== 200) return null;

  const filas = parsearFilasRsc(response.getContentText());
  Logger.log("Filas interpretadas: " + filas.length);
  const miembros = buscarMiembros(filas, 0);
  if (!miembros) {
    Logger.log("No se encontró el arreglo members. La respuesta puede tener otro formato.");
  }
  return miembros;
}

// Paso 1: ejecutar esta función y revisar el registro.
function probarListaRsc() {
  const miembros = obtenerMiembros();
  if (!miembros) return;
  Logger.log("Miembros recibidos: " + miembros.length);
  Logger.log("Claves y cuántos miembros las tienen: " + JSON.stringify(contarClaves(miembros)));
  const uuids = miembros.map((miembro) => miembro.uuid).filter(Boolean);
  Logger.log("Con uuid: " + uuids.length + ", únicos: " + new Set(uuids).size);
}

function nombreDe(miembro) {
  return (miembro.nameFormats && miembro.nameFormats.listPreferredLocal) || "";
}

function textoDe(valor) {
  return valor === undefined || valor === null ? "" : String(valor).trim();
}

// Paso 2 (solo si el paso 1 salió bien): arma la hoja «Padron» con las únicas columnas que usa
// el sistema: uuid, fullName, phone, email. El resto de los datos de cada miembro se descarta.
// Después: Archivo > Descargar > Valores separados por comas (.csv) con esa hoja activa.
function exportarPadron() {
  const miembros = obtenerMiembros();
  if (!miembros) return;
  const filas = miembros.map((miembro) => [
    textoDe(miembro.uuid),
    nombreDe(miembro),
    textoDe(miembro.phone),
    textoDe(miembro.email).toLowerCase(),
  ]);
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = libro.getSheetByName(HOJA_PADRON) || libro.insertSheet(HOJA_PADRON);
  hoja.clearContents();
  hoja.getRange(1, 1, 1, 4).setValues([["uuid", "fullName", "phone", "email"]]);
  hoja.getRange(2, 1, filas.length, 4).setNumberFormat("@"); // todo como texto: no pierde ceros ni signos +
  hoja.getRange(2, 1, filas.length, 4).setValues(filas);
  Logger.log("Filas escritas: " + filas.length);
  Logger.log("Sin teléfono: " + filas.filter((fila) => !fila[2]).length);
  Logger.log("Sin correo: " + filas.filter((fila) => !fila[3]).length);
}

// Borra el contenido de la hoja «Padron» cuando ya descargaste el CSV y lo importaste.
function limpiarPadron() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_PADRON);
  if (hoja) hoja.clearContents();
  Logger.log("Hoja del padrón vaciada.");
}

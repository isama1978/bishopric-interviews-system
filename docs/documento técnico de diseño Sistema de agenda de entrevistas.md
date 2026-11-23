# Sistema de agenda de entrevistas: documento técnico de diseño

Autor: Mauro · Versión 1.1 · 22 de noviembre de 2026 · Estado: diseño cerrado, construcción en curso

## 1. Propósito y contexto

Mauro es secretario del obispo de su barrio y gestiona las citas de los miembros con el obispo o con sus dos consejeros. Hoy lo hace a mano. El proyecto es **personal** (no oficial): una aplicación web responsiva que automatiza el pedido, el registro, la edición y la cancelación de entrevistas, con un dashboard de configuración para el obispado.

- Tamaño: 469 miembros en el listado de origen (Mauro estimaba unos 400). Un día de atención por semana.
- Atención habitual: martes desde las 19:00, 30 minutos por persona, la última entrevista **comienza** a las 21:30. Los domingos a las 8:30 el obispo también atiende cuando hace falta.
- Hoy solo el obispo atiende. No hay consejeros llamados, pero el sistema debe permitir cargarlos.
- Motivos de entrevista: responsabilidades (maestros, líderes de organizaciones), ayuda económica, asuntos de dignidad (pecados graves, adicciones), relaciones matrimoniales o entre hermanos, recomendación para el templo, otros.
- El obispo aprobó que Mauro use los datos del padrón para este sistema.
- Mauro es desarrollador frontend con capacidades full-stack. Prefiere respuestas en español, guía paso a paso, buenas prácticas, principios SOLID, sin `any`, funciones pequeñas, constantes en vez de valores fijos y reglas de negocio centralizadas en el backend.

## 2. Roles y permisos

Solo existen 4 usuarios del personal: 1 obispo (líder principal), 1 secretario y hasta 2 consejeros. Los miembros no tienen cuenta: entran con un enlace personal.

| Acción                                                               | Obispo (PRINCIPAL) | Secretario (SECRETARY) | Consejero (COUNSELOR) |
| -------------------------------------------------------------------- | ------------------ | ---------------------- | --------------------- |
| Ver todas las citas                                                  | Sí                 | Sí                     | Solo las propias      |
| Ver estadísticas                                                     | Sí                 | Sí                     | No                    |
| Configurar calendario, categorías, campos, banners, tema             | Sí                 | Sí                     | No                    |
| Crear y gestionar consejeros                                         | Sí                 | Sí                     | No                    |
| Cambiar al secretario                                                | Sí                 | No                     | No                    |
| Cambiar al obispo                                                    | No                 | Sí                     | No                    |
| Cantidad de entrevistas del día y minutos de sus propias entrevistas | Sí                 | Sí                     | Solo las suyas        |

Solo el obispo y el secretario pueden crear usuarios. Los límites de cantidad por rol (1, 1 y 2) son constantes de configuración, no valores dispersos en el código.

## 3. Reglas de negocio

1. **Calendario común.** El día de atención es el mismo para los tres líderes. Lo configuran el obispo o el secretario. Por defecto es el martes, pero puede habilitarse cualquier otro día (por ejemplo el domingo a las 8:30) y se decide a criterio personal si se atiende en feriados.
2. **Rango horario.** Se configura la hora de inicio y la hora de inicio de la **última** entrevista. El cierre no es determinante: la última puede pasarse un poco.
3. **Duración.** Configurable (15, 20, 30 minutos u otra). Cada líder tiene la suya y puede ajustarla para una fecha puntual. Cada cita guarda su propio inicio y fin, de modo que cambiar la duración no rompe las citas ya agendadas.
4. **Agenda por líder.** Cada líder tiene su propia agenda. Un horario ya registrado no se ofrece de nuevo para ese líder, pero puede ofrecerse para otro.
5. **Asuntos sensibles.** Existe una categoría única, «Asuntos sensibles», sin subclasificación y sin texto libre: el detalle se da en la entrevista. Solo el obispo puede atenderla. La regla se valida en el servidor, no solo ocultando opciones. La condición «sensible» es un atributo de la categoría (`isSensitive`), así que se pueden crear otras categorías sensibles sin tocar el código.
6. **Consejeros opcionales.** Un consejero solo se ofrece en el formulario si existe y está activo. Si no hay consejeros, el miembro solo ve al obispo.
7. **Martes lleno.** Si todos los horarios de una jornada están ocupados, el formulario permite elegir libremente entre las demás jornadas habilitadas.
8. **Varias citas pendientes.** Una persona puede tener más de una cita pendiente.
9. **Cancelación.** El miembro puede cancelar o modificar en cualquier momento (la tolerancia cultural es alta, aunque se considere descortés avisar tarde).
10. **Cancelación por un consejero** (una o todas sus citas): las citas pasan a una bandeja de «canceladas por el líder, en espera». El obispo elige: tomarla él como sobreturno, reasignarla al otro consejero, o cancelarla y avisar al miembro.
11. **Cancelación por el obispo.** Las citas comunes pueden reasignarse a un consejero. Las de asuntos sensibles **no** se reasignan. Si no hay forma de moverlas, se avisa al miembro de que no podrá ser atendido ese día. El aviso es manual (ver regla 13).
12. **Sobreturno.** Las excepciones se manejan como en un consultorio médico: el miembro sabe que esperará más, hasta el final de las entrevistas programadas. Un sobreturno no entra en la restricción de solapamiento. Se limita por jornada con `AppConfig.maxOverbookingsPerDay` (por defecto 3).
13. **Avisos y recordatorios manuales por WhatsApp.** Se descartó pagar la API de WhatsApp Business y las notificaciones push. En el dashboard, junto a cada cita que lo requiera, hay un botón «Avisar por WhatsApp» que abre `https://wa.me/<número>?text=<mensaje prellenado>` y la persona solo pulsa enviar. Los recordatorios del martes se mandan igual. Muchos miembros desconocen su correo; el WhatsApp es el medio más usado.
14. **Historial y estadísticas.** Se registran eventos de cada cita. Las estadísticas (realizadas, movidas, canceladas por el líder, canceladas por el miembro, no asistidas, por categoría) solo las ven el obispo y el secretario.
15. **Banners.** Avisos para quien abra el formulario, con categoría y color por nivel (info, success, warning, error).
16. **Campos adicionales.** El dashboard permite agregar más de un campo extra al formulario desde el primer día, y gestionar categorías de entrevista.
17. **Tema.** Modo claro u oscuro configurable (ver sección 5).

### Cálculo de horarios disponibles (corazón del dominio)

Dada una fecha, un líder y una categoría:

1. Se resuelve la jornada: si existe `ScheduleDay` para esa fecha, manda; si no, se usa `SchedulePattern` del día de la semana (0 = domingo ... 6 = sábado). Si está deshabilitada, no hay horarios.
2. Se genera la grilla desde `startMinute` avanzando de a N minutos mientras el inicio sea menor o igual a `lastStartMinute`. N = `LeaderDayOverride.minutesPerInterview`, o si es nulo `Leader.minutesPerInterview`, o si es nulo `AppConfig.defaultMinutesPerInterview`.
3. Se aplica el tope diario (`LeaderDayOverride.maxInterviews` o `Leader.maxInterviewsPerDay`).
4. Se restan las citas que ocupan agenda del líder: estados SCHEDULED, COMPLETED y NO\_SHOW. Las canceladas liberan el horario.
5. Si la categoría es sensible, solo se ofrece el líder PRINCIPAL. Los consejeros solo se ofrecen si están activos.
6. Todo se calcula en UTC y se muestra en la zona horaria de `AppConfig.timezone` (por defecto America/Argentina/Cordoba).

## 4. Experiencia del miembro

- **Enlace personal** `/m/<token>`. El token es `base64url(HMAC(MEMBER_LINK_SECRET, memberId + linkTokenVersion))`: no se guarda, se recalcula. Para invalidarlo se sube `linkTokenVersion`. No caduca por tiempo mientras el miembro esté activo; se regenera desde el dashboard. Se envía por WhatsApp.
- Con el enlace el sistema ya sabe quién es: puede pedir, editar y cancelar sus citas sin contraseña. Esta decisión **reemplazó** la idea inicial de un formulario público con desplegable de nombres y código de un solo uso, que permitía reservar a nombre de otro y exigía un canal pago para entregar el código.
- El desplegable con búsqueda por coincidencias (usa `fullNameSearch`, sin acentos y en minúsculas) queda para el personal cuando agenda en nombre de un miembro.
- Formulario: líder (desplegable), asunto (categoría), día y hora, y los campos adicionales configurados. Muestra banners activos y un aviso de privacidad.
- Los tres líderes aparecen solo si existen. Los asuntos sensibles bloquean la elección de consejeros.
- Tema: por defecto global (claro u oscuro, configurable) con opción de seguir el tema del sistema.
- Límite de intentos sobre los enlaces para frenar adivinación de tokens.

## 5. Dashboard del personal

Módulos: calendario completo (el obispo ve las citas de los tres; cada consejero solo las suyas, con detalles por día), jornadas y excepciones (habilitar o deshabilitar fechas), líderes y consejeros, categorías, campos del formulario, banners (alta, edición y baja), importación del padrón, bandeja de canceladas por el líder, avisos por WhatsApp, estadísticas, auditoría, usuarios y preferencia de tema.

- **Campos dinámicos:** `FormField` con clave estable, etiqueta, tipo (TEXT, TEXTAREA, SELECT, CHECKBOX, NUMBER), obligatorio, opciones, orden, activo y `isRestricted` (solo visible al obispo y al secretario). Las respuestas se guardan como JSON validado contra la definición, con copia de la etiqueta vigente. Riesgo: un texto libre invita a escribir detalles sensibles, por eso hay advertencia y restricción de visibilidad.
- **Categorías:** nombre, `isSensitive`, activa, orden. Al desactivar una categoría con historial no se borra.
- **Banners:** título opcional, mensaje, nivel, activo, rango de fechas opcional, orden.
- **Tema:** preferencia independiente por usuario del personal (LIGHT, DARK o SYSTEM). Para miembros, valor por defecto global en `AppConfig.defaultMemberTheme` más opción de seguir el sistema.

## 6. Autenticación y seguridad

- **Contraseñas:** bcryptjs (JavaScript puro, evita problemas de compilación en Vercel), costo 12 definido como constante, largo máximo limitado porque bcrypt solo considera 72 bytes. Aclaración: bcrypt es **hashing**, no cifrado.
- **Alta y recuperación sin correo:** el obispo o el secretario generan un enlace de un solo uso (vence en 24 a 48 horas) y lo mandan por WhatsApp. Sirve para activar la cuenta y para restablecer una contraseña olvidada. Un consejero logueado puede cambiar su propia contraseña. Más adelante se podría sumar recuperación por correo (Resend, plan gratuito).
- **Sesiones:** cookies `httpOnly` y `secure`, vigencia de unas 8 horas, bloqueo temporal tras varios intentos fallidos. TOTP opcional para obispo y secretario (segunda etapa).
- **Cifrado de datos en la aplicación:** AES-256-GCM para teléfono, correo, secreto TOTP y cookies de sesión de la iglesia (columnas `*Enc`: iv + tag + texto cifrado en base64), con la clave en `APP_ENCRYPTION_KEY`.
- **Claves derivadas:** `MEMBER_LINK_SECRET` protege los enlaces personales de los miembros y es independiente de `APP_ENCRYPTION_KEY` y `SESSION_SECRET`. Los tokens de sesión y de activación se guardan hasheados.
- **Mínimo acceso:** los consejeros ven el contacto solo de los miembros con citas asignadas a ellos. Nada de teléfonos ni correos en logs ni en listados innecesarios.
- **Otros:** HTTPS (Vercel), `noindex` en todo el sitio, auditoría de quién vio o cambió qué (`AuditLog`), copias de seguridad periódicas con `pg_dump` cifrado (la restauración del plan gratuito de Neon es limitada), entorno de pruebas con datos ficticios y repositorio privado.
- **Marco legal:** en Argentina la Ley 25.326 trata como dato sensible lo que revela convicciones religiosas. Pendiente averiguar si el sistema requiere registro o si la iglesia ya tiene un marco que lo cubra (no es asesoramiento legal). El formulario incluye aviso de privacidad.
- **Historial por persona:** las estadísticas generales son agregadas y sin nombres por defecto. El detalle por persona vive solo en la ficha de la cita, visible para obispo y secretario. Se sugirió retención de unos 2 años y borrado a pedido. Decisión final pendiente con el obispo.

## 7. Arquitectura

**Decisión:** Next.js (App Router) como aplicación única, sin backend separado. Alcanza para este volumen (400 miembros, 4 usuarios, un día a la semana). Un Nest aparte solo se justificaría con varios clientes, procesos largos, equipos separados o escalado independiente. Si algún día aparece una app móvil, la lógica ya estará aislada en casos de uso.

**Pila:** Next.js + TypeScript estricto, Prisma (ORM), PostgreSQL en Neon (plan gratuito, con pooler para el runtime y conexión directa para migraciones), despliegue en Vercel, Zod en los bordes, Vitest para pruebas. Autenticación propia con sesiones o Auth.js solo para el personal.

**Arquitectura hexagonal por módulos:** dominio (reglas puras, sin Prisma ni Next), aplicación (casos de uso que dependen de puertos), infraestructura (adaptadores Prisma, fuentes del padrón, cifrado) y entrada (rutas, Server Actions y páginas delgadas). Una raíz de composición (`composition-root.ts`) instancia los adaptadores y los inyecta, sin contenedor de dependencias.

```
src/
  modules/
    interviews/ members/ leaders/ scheduling-config/ form-config/ auth/ stats/
      domain/ application/ infrastructure/ interfaces/
  shared/ constants/ errors/ validation/
  app/            # rutas de Next.js, delgadas
  composition-root.ts
```

**Puertos principales:** `InterviewRepository`, `MemberDirectorySource` (implementaciones `CsvSource`, y una futura `ChurchApiSource`), `Clock`, `TokenService`, cifrado y envío de avisos.

**Normas de código:** `strict` y `noUncheckedIndexedAccess` activados; regla ESLint `no-explicit-any` como error; datos externos como `unknown` validados con Zod; funciones pequeñas de una sola responsabilidad; estados, roles, duraciones, zona horaria y textos de interfaz en constantes, configuración o archivo de mensajes en español; errores de dominio tipados (`SlotAlreadyTakenError`, `ForbiddenLeaderForCategoryError`) traducidos en la capa de rutas; los módulos con reglas reales (entrevistas, agenda, importación, permisos) siguen la hexagonal con rigor, y los CRUD simples (banners, categorías) pueden usar los tipos de Prisma a través del repositorio.

**Cuidados de Vercel y Neon:** límites de tiempo de las funciones (procesar la importación en lotes), uso del pooler de Neon para no agotar conexiones.

## 8. Modelo de datos (Prisma)

Archivos entregados en el chat anterior: `prisma/schema.prisma` y `prisma/sql/001_constraints.sql`. Hay que volver a adjuntarlos en un chat nuevo. Resumen de todo lo diseñado:

**Enumerados:** StaffRole (PRINCIPAL, SECRETARY, COUNSELOR); ThemeMode (LIGHT, DARK, SYSTEM); StaffTokenPurpose (ACTIVATION, PASSWORD\_RESET); InterviewStatus (SCHEDULED, COMPLETED, NO\_SHOW, CANCELLED\_BY\_MEMBER, CANCELLED\_BY\_LEADER\_PENDING, CANCELLED\_NOTIFIED); InterviewEventType (CREATED, RESCHEDULED, CANCELLED\_BY\_MEMBER, CANCELLED\_BY\_LEADER, REASSIGNED, TAKEN\_BY\_PRINCIPAL, MEMBER\_NOTIFIED, COMPLETED, NO\_SHOW); FormFieldType (TEXT, TEXTAREA, SELECT, CHECKBOX, NUMBER); BannerLevel (INFO, SUCCESS, WARNING, ERROR).

**Modelos:**

- `Member`: id (cuid), `churchUuid` único (identificador estable que trae el listado de origen), fullName, fullNameSearch, phoneEnc, emailEnc, linkTokenVersion (1), isActive, lastSyncedAt, createdAt, updatedAt.
- `StaffUser`: id, username único, displayName, role, passwordHash (bcrypt, nulo hasta activar), isActive, failedLoginCount, lockedUntil, themeMode (SYSTEM), totpSecretEnc, timestamps.
- `StaffSession`: id, staffUserId, tokenHash único, expiresAt. `StaffToken`: id, staffUserId, purpose, tokenHash único, expiresAt, usedAt, issuedById.
- `Leader` (el secretario no tiene fila): id, staffUserId único, minutesPerInterview, maxInterviewsPerDay (nulos = valor por defecto o sin tope), sortOrder, isActive. `LeaderDayOverride`: leaderId, date, minutesPerInterview, maxInterviews, único por líder y fecha.
- `SchedulePattern`: weekday único (0 a 6), startMinute, lastStartMinute, isEnabled. `ScheduleDay`: date única, isEnabled, startMinute, lastStartMinute, note.
- `InterviewCategory`: name único, isSensitive, isActive, sortOrder. `FormField` (ver sección 5). `InterviewAnswer`: interviewId, fieldId, fieldLabel, value (JSON), único por cita y campo.
- `Interview`: memberId, leaderId, categoryId, startsAt y endsAt (timestamptz UTC), status, isOverbooking, timestamps; índices por líder, miembro, estado y categoría.
- `InterviewEvent` (solo alta): interviewId, type, occurredAt, actorStaffId (nulo si lo hizo el miembro), fromStartsAt, toStartsAt, fromLeaderId, toLeaderId.
- `Banner`, `AppConfig` (fila única id 1: timezone, defaultMemberTheme, defaultMinutesPerInterview 30, maxOverbookingsPerDay 3, privacyNotice), `ChurchSession` (fila única, reservada para una integración futura con cookies cifradas), `AuditLog` (actor, acción, tipo y id de entidad).

**Restricciones SQL (migración manual):** extensión `btree_gist`; CHECK de fin posterior a inicio; `EXCLUDE` con `tstzrange` que impide solapamientos por líder (solo estados que ocupan agenda y excluyendo sobreturnos) y por miembro; CHECKs de rangos de minutos y valores positivos; índices parciales que garantizan un solo obispo activo y un solo secretario activo; CHECK de fila única en AppConfig y ChurchSession; trigger que hace `InterviewEvent` de solo alta. El máximo de consejeros (2) se controla en la aplicación. Se aplican con `prisma migrate dev --create-only --name constraints` pegando el SQL en el `migration.sql`.

**Concurrencia:** al insertar una cita se captura la violación de la restricción y se convierte en `SlotAlreadyTakenError`.

## 9. Padrón de miembros

**Historia de la fuente de datos.** Mauro tenía un script de Google Apps Script que llamaba a un endpoint interno de la API de la iglesia con cookies de sesión copiadas a mano y volcaba los nombres en la columna M de una hoja. Ese endpoint dejó de funcionar (404) y la URL de la página devolvía HTML. Más tarde se descubrió que la lista se pide con una acción de servidor de Next.js (un POST con la cabecera `next-action` y un cuerpo corto) y que responde en líneas `id:JSON` con un arreglo `members` de 469 miembros. Cada miembro trae un `uuid` único, el nombre, y teléfono y correo cuando los tiene. También trae datos que el sistema no necesita y que se descartan: coordenadas de domicilio, edad, sexo, fecha de nacimiento, familia y organizaciones. **Decisión:** el proyecto no llama al sitio de la iglesia en tiempo de ejecución. Es un endpoint interno: el identificador de la acción cambia con cada versión del sitio, las cookies caducan y el formato puede cambiar. En su lugar, un script de Google Sheets (`exportar_padron.gs`) hace esa llamada con la sesión de Mauro y genera el CSV que el proyecto importa. No se intenta sortear controles de seguridad. La interfaz `MemberDirectorySource` mantiene `CsvSource` como fuente real y deja abierta una futura `ChurchApiSource`.

**Ruta principal: exportador en Google Sheets** (`tools/exportar_padron.gs`). Prueba del 22 de noviembre de 2026: código 200, contenido `text/x-component`, 469 miembros, 469 `uuid` únicos, teléfono en 197 miembros y correo en 134 (coincide con el PDF: 272 sin teléfono y 335 sin correo).

- Funciones: `guardarCookies` (filtra y guarda las cookies en las propiedades del script), `mostrarCookiesGuardadas` (solo nombres), `probarListaRsc` (solo cantidades y nombres de claves), `exportarPadron` (hoja `Padron` con `uuid`, `fullName`, `phone` y `email`, todo como texto) y `limpiarPadron`.
- Constantes al inicio del script: `ID_ACCION` (cabecera `next-action`, cambia con cada versión del sitio) y `CUERPO_ACCION` (cuerpo de la petición, entre comillas simples).
- Mantenimiento: renovar las cookies antes de cada uso con el encabezado `Cookie` de la petición `member-list` y, si responde con redirección o con otro formato, copiar de nuevo `next-action` y el cuerpo desde DevTools. No pegar nunca cookies ni datos de miembros en un chat.
- Salida: se descarga la hoja `Padron` como CSV, se importa al sistema y se vacía la hoja con `limpiarPadron`. Los demás campos del listado no se copian.
- El PDF no trae `uuid`, por eso no se usa como fuente de importación en la primera versión.

**Ruta de respaldo: PDF a CSV local.** El PDF trae las columnas Nombre, Sexo, Edad, Fecha de nacimiento, Número de teléfono y Correo electrónico. **No trae el número de miembro.** El programa `tools/pdf_a_csv.py` (Python y `pdfplumber`) se ejecuta en la computadora de Mauro, sin red:

- En cada página busca el encabezado (se repite en todas), toma la posición de cada columna y usa las líneas horizontales como separadores de fila, de modo que no depende de que las filas tengan fondo de color. Los límites laterales se calculan con el texto y no con las líneas, porque en algunas páginas las líneas vienen partidas en tramos cortos, y se tolera una diferencia de 15 puntos en los cruces.
- Parámetros útiles: --esperados N compara con el total esperado y avisa si no coincide; --filas-por-texto cambia el método de separación de filas si no hubiera líneas.
- Descarta Sexo y Edad (minimización de datos). Convierte la fecha a AAAA-MM-DD (acepta dd/mm/aaaa y el mes en español).
- CSV de salida: `fullName`, `birthDate`, `phone`, `email`.
- Modo `--diagnostico`: muestra solo estructura, sin datos.
- Al terminar imprime un resumen sin nombres. Recordatorio: borrar el PDF y el CSV del equipo tras importar y no dejarlos en carpetas sincronizadas.

**Primera ejecución real:** 17 páginas y 469 filas exportadas, que coincide con el total del PDF. Reparto por página: 25, 27, 33, 28, 26, 30, 29, 28, 28, 26, 31, 30, 28, 30, 32, 28 y 10. Sin fecha válida: 0. Sin teléfono: 272. Sin correo: 335. Combinaciones nombre y fecha repetidas: 0. La primera versión leía solo las filas sombreadas (235) y se corrigió. **Verificación:** revisar a ojo unas filas del CSV antes de importar (un correo largo, un nombre largo, una fila sin teléfono) por si hay datos cortados o columnas corridas.

**Contactos faltantes.** El 58% de los registros no tiene teléfono y el 71% no tiene correo. Consecuencias de diseño: (1) el dashboard necesita editar el teléfono de cada miembro a mano, porque sin él no hay enlace ni aviso por WhatsApp; (2) la importación nunca reemplaza un teléfono o un correo existente por un valor vacío; (3) las pantallas con botón de WhatsApp indican con claridad cuándo falta el número; (4) a esos miembros hay que hacerles llegar el enlace personal por otra vía. Decisión pendiente: cómo marcar los contactos cargados a mano para que una importación posterior no los pise (por ejemplo, un campo booleano en Member).

**Identificador único (`churchUuid`).** Cada miembro trae un `uuid` estable en el listado de origen, que se guarda como `Member.churchUuid` (único) y se usa como clave de importación. Reemplaza la clave inventada por HMAC de nombre y fecha de nacimiento que se había diseñado cuando solo se disponía del PDF: ya no hacen falta la fecha de nacimiento, el secreto `MEMBER_MATCH_SECRET` ni la conciliación manual por cambios de nombre. El `id` interno (cuid) sigue siendo la clave real del sistema y la base de los enlaces personales.

**Pantalla de importación:** el CSV (`uuid`, `fullName`, `phone`, `email`) se valida con Zod (columnas obligatorias, uuid válido y sin repetidos, formato de correo); se muestra un resumen de altas, cambios de contacto, bajas y conflictos sin exponer contactos; al confirmar se hace _upsert_ por `churchUuid` (teléfono y correo cifrados), nunca se reemplaza un contacto existente por uno vacío y los que ya no figuran quedan inactivos, nunca se borran. La importación se procesa en lotes.

## 10. Flujo de estados de una cita

- **SCHEDULED:** cita vigente. Puede pasar a COMPLETED, NO\_SHOW (los marca el líder o el secretario tras la jornada), CANCELLED\_BY\_MEMBER o CANCELLED\_BY\_LEADER\_PENDING.
- **CANCELLED\_BY\_LEADER\_PENDING:** bandeja del obispo. Opciones: tomarla (TAKEN\_BY\_PRINCIPAL, como sobreturno), reasignar a otro consejero (REASSIGNED, vuelve a SCHEDULED) o cancelar y avisar (MEMBER\_NOTIFIED, pasa a CANCELLED\_NOTIFIED).
- Cada cambio genera un evento en `InterviewEvent`, incluida la reprogramación (RESCHEDULED con horario anterior y nuevo). Las estadísticas salen de esa tabla, no del estado actual.
- Las citas de asuntos sensibles canceladas por el obispo no se reasignan: quedan para reprogramar o avisar.

## 11. Plan de construcción

**Variables de entorno:** `DATABASE_URL` (pooler), `DIRECT_URL` (directa), `APP_ENCRYPTION_KEY`, `MEMBER_LINK_SECRET`, `SESSION_SECRET`. Cada secreto se genera con `openssl rand -base64 32`. Se mantiene un `.env.example` sin valores, y `.env.local` nunca se sube al repositorio.

**Pasos de arranque:**

1. Instalar Node LTS y Git; crear cuentas en GitHub, Vercel y Neon.
2. Crear el proyecto en Neon y copiar las dos cadenas de conexión.
3. `npx create-next-app@latest agenda-entrevistas --typescript --eslint --app --src-dir --import-alias "@/*"`.
4. `npm i @prisma/client zod bcryptjs` y `npm i -D prisma @types/bcryptjs vitest`.
5. TypeScript estricto, `noUncheckedIndexedAccess` y regla `no-explicit-any`.
6. Configurar variables de entorno.
7. `npx prisma init`, copiar `schema.prisma` y `001_constraints.sql`, correr `migrate dev --name init` y la migración `--create-only` de restricciones.
8. Crear la estructura de carpetas y `composition-root.ts`.
9. Seed: `AppConfig`, categoría «Asuntos sensibles» (`isSensitive: true`), categorías comunes, regla semanal del martes (19:00 = 1140, 21:30 = 1290) y usuario del secretario con enlace de activación.
10. Vitest, empezando por las reglas de dominio.
11. Repositorio privado en GitHub, despliegue en Vercel con las variables cargadas.

**Orden de construcción:** (1) constantes, errores y esquemas Zod compartidos; (2) dominio de agenda con pruebas; (3) importación del padrón con `CsvSource`; (4) autenticación del personal y política de permisos; (5) formulario del miembro con enlace personal; (6) dashboard de configuración; (7) bandeja de cancelaciones y reasignaciones; (8) estadísticas. Primera versión acotada: dejar para una segunda etapa estadísticas, campos dinámicos y TOTP si hace falta acotar.

## 12. Decisiones y descartes

- Next.js único en vez de Next más Nest: la complejidad no lo justifica.
- Neon permite procedimientos almacenados, pero se prefieren reglas de negocio en TypeScript y en la base solo restricciones de integridad y el trigger de historial.
- Enlace personal en lugar de código de un solo uso y de formulario público abierto.
- Sin notificaciones push ni API de WhatsApp (de pago): avisos manuales con enlaces `wa.me`.
- Sin recuperación por correo en la primera versión.
- El padrón lo genera un script de Google Sheets (uuid, nombre, teléfono y correo) que exporta un CSV. El proyecto solo lee el CSV y no llama al sitio de la iglesia. El PDF queda como respaldo de referencia.
- Solo se importan uuid, nombre, teléfono y correo. Se descartan sexo, edad, fecha de nacimiento, domicilio, familia y organizaciones.
- Los asuntos sensibles se validan en el servidor.
- Las excepciones son sobreturnos al final de la jornada.

## 13. Pendientes y próximos pasos

1. Revisar el CSV generado por el exportador (469 filas) antes de importar y confirmar con el obispo qué personas incluye el listado.
2. Esquema Zod del CSV (`uuid`, `fullName`, `phone`, `email`) y caso de uso de importación con pruebas.
3. Módulo de agenda: función de horarios disponibles con pruebas.
4. Seed inicial.
5. Definir con el obispo la retención del historial y el uso de estadísticas por persona.
6. Averiguar el marco legal de protección de datos (Ley 25.326).
7. Probar el despliegue temprano en Vercel y Neon.

## 14. Cómo retomar en otro chat

Adjuntar este documento, la lista de tareas, `schema.prisma`, `001_constraints.sql` y `exportar_padron.gs` (y `pdf_a_csv.py` solo como respaldo). Pedir a Claude que lo lea completo antes de continuar y que responda en español, con guía paso a paso y respetando las normas de código de la sección 7. No pegar nunca datos reales de miembros, cookies ni secretos en el chat.

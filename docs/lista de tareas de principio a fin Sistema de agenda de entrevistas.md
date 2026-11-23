# Sistema de agenda de entrevistas: lista de tareas de principio a fin

Autor: Mauro · Versión 1.0 · 21 de noviembre de 2026 · Complemento del documento técnico de diseño

## Cómo usar esta lista

- Marcas: \[ \] pendiente, \[\~\] en curso, \[x\] hecho, \[-\] descartado. Al terminar una tarea se cambia la marca y se anota la fecha entre paréntesis.
- Cada tarea tiene un número (fase.tarea) para citarla en otros chats, por ejemplo «tarea 4.6».
- Al pasar este documento a un chat nuevo, pedir a Claude que lea esta lista y el documento técnico, que continúe desde la primera tarea pendiente y que actualice las marcas al terminar cada paso.
- Una tarea se marca como hecha solo cuando funciona y tiene su prueba, si corresponde. Las tareas de seguridad, Docker y CI/CD cuentan igual que las funcionales.
- Si aparece una tarea nueva, se agrega a la fase que corresponde con el siguiente número libre. No se renumeran las demás.

## Estado actual

Diseño completo, esquema de base de datos redactado y exportador del padrón en Google Sheets probado (469 miembros, 469 uuid únicos). La construcción del proyecto se lleva en otro chat: al retomar, confirmar qué tareas ya están hechas y actualizar las marcas. Próxima tarea pendiente: la primera sin marcar.

## Fase 0. Diseño y preparación

- [x] 0.1 Relevar reglas de negocio, roles y permisos con el obispo
- [x] 0.2 Definir la pila: Next.js único, Prisma, PostgreSQL (Neon), Zod, Vitest
- [x] 0.3 Definir la arquitectura hexagonal por módulos y las normas de código
- [x] 0.4 Definir la autenticación: bcryptjs, enlaces de activación, sesiones, TOTP opcional
- [x] 0.5 Definir el enlace personal del miembro (HMAC) y la clave de coincidencia del padrón
- [x] 0.6 Redactar `schema.prisma` completo
- [x] 0.7 Redactar `001_constraints.sql` (solapamientos, CHECK, índices parciales, trigger)
- [x] 0.8 Escribir el documento técnico de diseño
- [x] 0.9 Conseguir la aprobación del obispo para usar los datos del padrón
- [x] 0.10 Programa `pdf_a_csv.py` funcionando como respaldo (469 filas exportadas del PDF)
- [ ] 0.11 Revisar a ojo el CSV que genera el exportador: un correo largo, un nombre largo y una fila sin teléfono
- [ ] 0.12 Confirmar con el obispo qué personas incluye el listado de 469 registros
- [x] 0.13 Probar el exportador del padrón en Google Sheets: 469 miembros, 469 uuid únicos, teléfono en 197 y correo en 134
- [ ] 0.14 Ejecutar exportarPadron, descargar el CSV de la hoja Padron y revisarlo a ojo

## Fase 1. Cuentas y herramientas

- [ ] 1.1 Instalar Node LTS, Git, Docker (Desktop o Engine) y un editor de código
- [ ] 1.2 Instalar Python y pdfplumber solo si hay que volver a generar el CSV
- [ ] 1.3 Crear la cuenta de GitHub y un repositorio privado
- [ ] 1.4 Activar 2FA en GitHub y configurar clave SSH
- [ ] 1.5 Crear la cuenta de Neon y el proyecto de base de datos
- [ ] 1.6 Guardar las dos cadenas de conexión (pooler y directa) en un gestor de contraseñas
- [ ] 1.7 Crear la cuenta en la plataforma de despliegue elegida en la tarea 16.1
- [ ] 1.8 Elegir y usar un gestor de contraseñas para todos los secretos

## Fase 2. Proyecto base y calidad de código

- [ ] 2.1 Crear el proyecto con `npx create-next-app@latest agenda-entrevistas` (TypeScript, ESLint, App Router, carpeta src, alias de importación @/\*)
- [ ] 2.2 Inicializar Git, hacer el primer commit y configurar `.gitignore` con `.env*`, CSV y PDF
- [ ] 2.3 Activar `strict` y `noUncheckedIndexedAccess` en `tsconfig.json`
- [ ] 2.4 Activar la regla ESLint `no-explicit-any` como error
- [ ] 2.5 Instalar y configurar Prettier
- [ ] 2.6 Instalar Vitest y crear el script `test`
- [ ] 2.7 Configurar Husky y lint-staged para que el commit corra lint y formato
- [ ] 2.8 Adoptar Conventional Commits y validarlos con commitlint
- [ ] 2.9 Crear la estructura de carpetas por módulos (`src/modules/*`, `src/shared/*`)
- [ ] 2.10 Regla de lint que impida que el dominio importe Prisma o Next (por ejemplo eslint-plugin-boundaries)
- [ ] 2.11 Crear `composition-root.ts` vacío con su propósito comentado
- [ ] 2.12 Crear `.env.example` con todas las variables y sin valores
- [ ] 2.13 Generar los secretos con `openssl rand -base64 32` y cargarlos en `.env.local`
- [ ] 2.14 Validar las variables de entorno al arrancar con Zod (falla si falta alguna)
- [ ] 2.15 Escribir un `README` con las instrucciones de arranque

## Fase 3. Docker y entorno local

- [ ] 3.1 Escribir `docker-compose.yml` de desarrollo con PostgreSQL de versión fija y un volumen
- [ ] 3.2 Verificar que esa imagen de Postgres incluye la extensión `btree_gist`
- [ ] 3.3 Apuntar `.env.local` a la base del contenedor para trabajar sin tocar Neon
- [ ] 3.4 Escribir un `Dockerfile` multietapa (dependencias, build, ejecución)
- [ ] 3.5 Activar `output: standalone` en la configuración de Next.js
- [ ] 3.6 Ejecutar el contenedor con un usuario sin privilegios (no root)
- [ ] 3.7 Crear `.dockerignore` (node\_modules, .next, .env\*, CSV, PDF, .git)
- [ ] 3.8 Fijar la versión exacta de las imágenes base y, más adelante, su digest
- [ ] 3.9 Crear la ruta `/api/health` sin datos sensibles y agregar `HEALTHCHECK` al contenedor
- [ ] 3.10 Pasar los secretos como variables de entorno en tiempo de ejecución, nunca dentro de la imagen
- [ ] 3.11 Correr las migraciones (`prisma migrate deploy`) como paso separado y no al iniciar la aplicación
- [ ] 3.12 Comprobar que Prisma incluye el binario correcto para la imagen final
- [ ] 3.13 Medir el tamaño de la imagen y reducirlo (etapas, sin dependencias de desarrollo)
- [ ] 3.14 Probar un `docker compose` de producción local (aplicación y base) de punta a punta
- [ ] 3.15 Agregar scripts npm para levantar y bajar el entorno y documentarlos en el README
- [ ] 3.16 Correr hadolint (linter de Dockerfile) de forma local

## Fase 4. Base de datos y Prisma

- [ ] 4.1 Ejecutar `npx prisma init` y copiar `schema.prisma`
- [ ] 4.2 Revisar el esquema contra el documento técnico (campos, enumerados, relaciones)
- [ ] 4.3 Crear la primera migración: `prisma migrate dev --name init`
- [ ] 4.4 Crear la migración `--create-only` de restricciones y pegar `001_constraints.sql`
- [ ] 4.5 Aplicar y comprobar que existen la exclusión por líder, la exclusión por miembro, los CHECK, los índices parciales y el trigger
- [ ] 4.6 Prueba manual: insertar dos citas solapadas y comprobar que la base las rechaza
- [ ] 4.7 Prueba manual: editar o borrar un `InterviewEvent` y comprobar que falla
- [ ] 4.8 Resolver la decisión D1 (contactos cargados a mano) y migrar el campo
- [ ] 4.9 Configurar Prisma Client como instancia única para no agotar conexiones en desarrollo
- [ ] 4.10 Usar el pooler de Neon en ejecución y la conexión directa en las migraciones
- [ ] 4.11 Escribir `prisma/seed.ts`: `AppConfig`, categoría «Asuntos sensibles» con `isSensitive`, categorías comunes, regla del martes (1140 a 1290) y usuario del secretario
- [ ] 4.12 Hacer el seed idempotente (se puede correr varias veces)
- [ ] 4.13 Crear un conjunto de datos ficticios para desarrollo (nunca datos reales)
- [ ] 4.14 Documentar el flujo de migraciones y cómo volver atrás

## Fase 5. Núcleo compartido

- [ ] 5.1 Constantes: roles, estados, tipos de evento, duraciones permitidas, límites (máximo 2 consejeros, sobreturnos), zona horaria por defecto, costo de bcrypt y vigencias de tokens
- [ ] 5.2 Archivo de mensajes de la interfaz en español
- [ ] 5.3 Errores de dominio tipados (`SlotAlreadyTakenError`, `ForbiddenLeaderForCategoryError`, etc.)
- [ ] 5.4 Manejo uniforme de errores y su traducción en las rutas
- [ ] 5.5 Esquemas Zod compartidos (identificadores, fechas, minutos del día)
- [ ] 5.6 Servicio de cifrado AES-256-GCM con pruebas
- [ ] 5.7 Servicio de HMAC para los enlaces personales, con pruebas
- [ ] 5.8 Servicio de hash de contraseñas con bcryptjs (costo 12 en una constante, límite de 72 bytes), con pruebas
- [ ] 5.9 Servicio de reloj (`Clock`) para probar con fechas fijas
- [ ] 5.10 Utilidades de zona horaria (UTC a Córdoba y viceversa), con pruebas
- [ ] 5.11 Normalizador de nombres (sin acentos, minúsculas, espacios simples), con pruebas
- [ ] 5.12 Interfaces de los puertos: repositorios, `MemberDirectorySource`, `TokenService`, notificaciones
- [ ] 5.13 Logger que nunca registra teléfonos, correos, cookies ni tokens

## Fase 6. Dominio de agenda

- [ ] 6.1 Resolver la jornada de una fecha (excepción `ScheduleDay` o regla `SchedulePattern`)
- [ ] 6.2 Generar la grilla de horarios desde `startMinute` hasta `lastStartMinute`
- [ ] 6.3 Resolver la duración efectiva (ajuste del día, del líder o valor global)
- [ ] 6.4 Aplicar el tope diario de entrevistas
- [ ] 6.5 Restar los horarios ocupados del líder (SCHEDULED, COMPLETED, NO\_SHOW)
- [ ] 6.6 Filtrar líderes elegibles según la categoría (sensible solo para el obispo; consejeros solo si están activos)
- [ ] 6.7 Ofrecer otras jornadas habilitadas cuando una está llena
- [ ] 6.8 Reglas de sobreturno (límite por jornada, orden al final)
- [ ] 6.9 Pruebas unitarias de todo lo anterior, incluidas fechas límite y cambios de configuración
- [ ] 6.10 Prueba de integración de la restricción contra solapamientos con Postgres real

## Fase 7. Padrón de miembros

- [ ] 7.1 Esquema Zod del CSV (`uuid`, `fullName`, `phone`, `email`) con mensajes de error claros
- [ ] 7.2 Lector de CSV con validación de las columnas obligatorias
- [ ] 7.3 Usar `churchUuid` (el uuid del listado) como clave única de importación; sin fecha de nacimiento ni HMAC
- [ ] 7.4 Detección de uuid repetidos o inválidos en el archivo
- [ ] 7.5 Caso de uso de importación: altas, cambios de contacto, bajas lógicas y conflictos
- [ ] 7.6 La importación nunca reemplaza un contacto existente por uno vacío
- [ ] 7.7 Cifrado de teléfono y correo antes de guardar
- [ ] 7.8 Procesamiento por lotes, probado con 469 filas
- [ ] 7.9 Resumen previo a confirmar (sin mostrar contactos) y confirmación
- [ ] 7.10 Pantalla de importación en el dashboard
- [ ] 7.11 Edición manual del teléfono de un miembro desde el dashboard
- [ ] 7.12 Indicador claro cuando falta el teléfono (botón de WhatsApp deshabilitado)
- [ ] 7.13 Búsqueda de miembros con autocompletado (`fullNameSearch`)
- [ ] 7.14 Pruebas del caso de uso con repositorio falso y con base real
- [ ] 7.15 Importar el padrón real una sola vez en producción, vaciar la hoja Padron y borrar el CSV descargado del equipo
- [ ] 7.16 Escribir el procedimiento de mantenimiento del exportador (renovar cookies; copiar next-action y el cuerpo de la petición si el sitio cambia)
- [ ] 7.17 Documentar qué hacer si el exportador deja de funcionar (carga manual de contactos o uso del PDF de respaldo)

## Fase 8. Autenticación y permisos

- [ ] 8.1 Caso de uso: crear usuario del personal (solo obispo o secretario)
- [ ] 8.2 Límites por rol (1 obispo, 1 secretario, hasta 2 consejeros)
- [ ] 8.3 Enlaces de activación y de restablecimiento (un solo uso, vigencia de 24 a 48 horas, guardados hasheados)
- [ ] 8.4 Pantalla de activación donde el usuario elige su contraseña
- [ ] 8.5 Login con bcryptjs, contador de fallos y bloqueo temporal
- [ ] 8.6 Sesiones con cookies httpOnly y secure, expiración de 8 horas
- [ ] 8.7 Cierre de sesión e invalidación de sesiones
- [ ] 8.8 Cambio de contraseña con la sesión iniciada
- [ ] 8.9 Generar el enlace de restablecimiento desde el dashboard
- [ ] 8.10 Política de permisos centralizada (matriz de roles), con pruebas
- [ ] 8.11 Guardas en el servidor que apliquen la política
- [ ] 8.12 Regla: solo el secretario cambia al obispo; el obispo cambia al secretario; ambos gestionan consejeros
- [ ] 8.13 Alta y baja de consejeros desde el dashboard
- [ ] 8.14 Vista del consejero limitada a sus propias citas
- [ ] 8.15 TOTP opcional para obispo y secretario (segunda etapa)
- [ ] 8.16 Pruebas de autorización: cada rol intenta acciones que no le corresponden

## Fase 9. Enlace personal y formulario del miembro

- [ ] 9.1 Generar y verificar el token del enlace personal (HMAC con versión)
- [ ] 9.2 Ruta `/m/<token>` que identifica al miembro sin contraseña
- [ ] 9.3 Límite de intentos por IP sobre los enlaces
- [ ] 9.4 Regenerar el enlace desde el dashboard (sube `linkTokenVersion`)
- [ ] 9.5 Botones de copiar y de enviar el enlace por WhatsApp (`wa.me`)
- [ ] 9.6 Formulario: líder, asunto, día y hora y campos adicionales
- [ ] 9.7 El desplegable de líderes muestra solo consejeros activos
- [ ] 9.8 Bloqueo de consejeros si el asunto es sensible (interfaz y servidor)
- [ ] 9.9 Mostrar los horarios disponibles según el dominio de agenda
- [ ] 9.10 Mostrar otras jornadas cuando una está llena
- [ ] 9.11 Mostrar los banners activos según su nivel
- [ ] 9.12 Aviso de privacidad en el formulario
- [ ] 9.13 Ver, editar y cancelar las citas propias
- [ ] 9.14 Tema claro, oscuro o del sistema para los miembros
- [ ] 9.15 Diseño responsivo probado en celular
- [ ] 9.16 `noindex` y cabeceras de seguridad en todo el sitio
- [ ] 9.17 Pruebas de la ruta con token válido, vencido y alterado

## Fase 10. Ciclo de vida de las citas

- [ ] 10.1 Caso de uso: crear cita (validaciones y captura de `SlotAlreadyTakenError`)
- [ ] 10.2 Guardar las respuestas de campos dinámicos validadas contra su definición
- [ ] 10.3 Caso de uso: reprogramar cita (evento RESCHEDULED)
- [ ] 10.4 Caso de uso: cancelar por el miembro
- [ ] 10.5 Caso de uso: cancelar por un líder (pasa a la bandeja)
- [ ] 10.6 Caso de uso: cancelar todas las citas de un consejero
- [ ] 10.7 Caso de uso: que el obispo tome la cita como sobreturno
- [ ] 10.8 Caso de uso: reasignar a otro consejero (solo asuntos comunes)
- [ ] 10.9 Caso de uso: cancelar definitivamente y marcar al miembro como avisado
- [ ] 10.10 Cancelación por el obispo: reasignar las comunes y dejar las sensibles para reprogramar
- [ ] 10.11 Marcar citas como realizadas o no asistidas
- [ ] 10.12 Cada operación registra su evento en `InterviewEvent` y su entrada de auditoría
- [ ] 10.13 Pruebas de cada caso de uso, incluidos los permisos

## Fase 11. Dashboard de configuración

- [ ] 11.1 Diseño general del dashboard y navegación según el rol
- [ ] 11.2 Configuración global (zona horaria, duración por defecto, tope de sobreturnos, aviso de privacidad)
- [ ] 11.3 Regla semanal (día, inicio, última entrevista, habilitado)
- [ ] 11.4 Excepciones por fecha (habilitar o deshabilitar, incluidos el domingo a las 8:30 y los feriados)
- [ ] 11.5 Duración y tope por líder, y ajuste por fecha (los consejeros solo lo suyo)
- [ ] 11.6 Categorías: alta, edición, orden, activar o desactivar y marca de sensible
- [ ] 11.7 Campos del formulario: alta, edición, tipos, opciones, orden, restringido y activar
- [ ] 11.8 Advertencia en los campos de texto libre sobre datos sensibles
- [ ] 11.9 Banners: alta, edición, baja, nivel, fechas y orden
- [ ] 11.10 Preferencia de tema del usuario del personal
- [ ] 11.11 Tema por defecto para los miembros
- [ ] 11.12 Gestión de usuarios del personal
- [ ] 11.13 Pruebas de permisos en cada pantalla de configuración

## Fase 12. Operación diaria

- [ ] 12.1 Calendario del obispo con las citas de los tres líderes por día y por semana
- [ ] 12.2 Detalle de cada cita
- [ ] 12.3 Vista del consejero con sus citas
- [ ] 12.4 Bandeja de canceladas por el líder con acciones (tomar, reasignar, cancelar y avisar)
- [ ] 12.5 Botón «Avisar por WhatsApp» con mensaje prellenado (cancelación, reprogramación, recordatorio)
- [ ] 12.6 Vista «Entrevistas del martes» con botón de recordatorio por cita
- [ ] 12.7 Marcar realizada o no asistió al terminar la jornada
- [ ] 12.8 Agendar en nombre de un miembro desde el dashboard

## Fase 13. Historial, estadísticas y auditoría

- [ ] 13.1 Consultas de estadísticas sobre `InterviewEvent`
- [ ] 13.2 Pantalla de estadísticas (realizadas, movidas, canceladas por líder, canceladas por miembro, no asistidas, por categoría y período)
- [ ] 13.3 Acceso solo para obispo y secretario
- [ ] 13.4 Agregados sin nombres por defecto
- [ ] 13.5 Ficha con detalle por persona, de acceso restringido
- [ ] 13.6 Registro de auditoría (quién vio o cambió qué) y pantalla de consulta
- [ ] 13.7 Implementar la retención del historial (decisión D2)
- [ ] 13.8 Borrado de los datos de un miembro a pedido

## Fase 14. Seguridad y privacidad

- [ ] 14.1 Cabeceras de seguridad (CSP, HSTS, X-Frame-Options y similares)
- [ ] 14.2 Revisar que ningún dato personal aparezca en logs ni en mensajes de error
- [ ] 14.3 Revisar que teléfonos y correos se descifren solo donde hace falta
- [ ] 14.4 Limitar intentos de login y de enlaces (rate limiting)
- [ ] 14.5 Protección contra CSRF en las acciones de formularios
- [ ] 14.6 Validar toda entrada en el servidor con Zod
- [ ] 14.7 Política de actualización de dependencias vulnerables
- [ ] 14.8 Probar que un consejero no ve citas ajenas ni campos restringidos
- [ ] 14.9 Probar que ninguna cita sensible puede quedar con un consejero
- [ ] 14.10 Probar que los tokens vencidos o reutilizados fallan
- [ ] 14.11 Averiguar el marco legal de protección de datos (decisión D3)
- [ ] 14.12 Escribir el aviso de privacidad definitivo
- [ ] 14.13 Escribir el procedimiento de rotación de secretos
- [ ] 14.14 Escribir el procedimiento ante la filtración de enlaces o cookies

## Fase 15. Integración continua (CI)

- [ ] 15.1 Definir el flujo de trabajo: ramas cortas, pull requests obligatorios y lista de verificación de revisión propia
- [ ] 15.2 Workflow de GitHub Actions con instalación de dependencias y caché
- [ ] 15.3 Paso de lint
- [ ] 15.4 Paso de verificación de tipos
- [ ] 15.5 Paso de formato (Prettier en modo comprobación)
- [ ] 15.6 Pruebas unitarias
- [ ] 15.7 Pruebas de integración con Postgres como servicio del workflow
- [ ] 15.8 Aplicar las migraciones en una base efímera y comprobar que no haya diferencias con el esquema (`prisma migrate diff`)
- [ ] 15.9 Validar `schema.prisma`
- [ ] 15.10 Build de producción de Next.js
- [ ] 15.11 Umbral mínimo de cobertura en el dominio
- [ ] 15.12 Presupuesto de tamaño del bundle con alerta si crece
- [ ] 15.13 Construir la imagen Docker en cada pull request
- [ ] 15.14 Lint del Dockerfile con hadolint
- [ ] 15.15 Escaneo de la imagen con Trivy (falla ante vulnerabilidades críticas)
- [ ] 15.16 Búsqueda de secretos filtrados (gitleaks) en cada push
- [ ] 15.17 Auditoría de dependencias (`npm audit`) y revisión de dependencias en pull requests
- [ ] 15.18 Análisis estático de seguridad (CodeQL)
- [ ] 15.19 Dependabot o Renovate para actualizaciones agrupadas
- [ ] 15.20 Proteger la rama principal: exigir chequeos aprobados, sin pushes directos y con historial lineal
- [ ] 15.21 Cancelar ejecuciones duplicadas (`concurrency`) y fijar las acciones por commit
- [ ] 15.22 Permisos mínimos del token del workflow (`permissions`)
- [ ] 15.23 Insignia de estado del pipeline en el README
- [ ] 15.24 Medir el tiempo total del pipeline y reducirlo

## Fase 16. Entrega y despliegue (CD)

- [ ] 16.1 Decidir la plataforma de despliegue (decisión D4). Vercel no ejecuta contenedores propios: para desplegar la imagen Docker hace falta un servicio de contenedores o un servidor propio. Revisar planes y límites vigentes antes de elegir.
- [ ] 16.2 Publicar la imagen en un registro (GitHub Container Registry) con etiquetas por commit y por versión
- [ ] 16.3 Entornos separados de staging y producción, cada uno con sus secretos y su base de datos
- [ ] 16.4 Crear bases separadas (por ejemplo una rama de Neon para staging)
- [ ] 16.5 Workflow que despliega a staging en cada merge a la rama principal
- [ ] 16.6 Paso de migraciones (`prisma migrate deploy`) antes de iniciar la nueva versión
- [ ] 16.7 Prueba de humo automática tras el despliegue (health check y una lectura)
- [ ] 16.8 Aprobación manual para producción (environments con revisores)
- [ ] 16.9 Desplegar a producción la misma imagen probada en staging
- [ ] 16.10 Estrategia de reversión: volver a la imagen anterior y escribir migraciones compatibles hacia atrás
- [ ] 16.11 Dominio propio y HTTPS con certificado automático
- [ ] 16.12 Cargar variables y secretos en la plataforma y en GitHub Environments, nunca en el repositorio
- [ ] 16.13 Si se usa un servidor propio: proxy inverso (Caddy o Nginx), firewall, usuario sin root, actualizaciones de seguridad automáticas y acceso solo por SSH con clave
- [ ] 16.14 Versionado semántico y changelog automatizado
- [ ] 16.15 Documentar el proceso de despliegue paso a paso

## Fase 17. Observabilidad, rendimiento y operación

- [ ] 17.1 Chequeo externo de disponibilidad (uptime) sobre `/api/health`
- [ ] 17.2 Registro estructurado de errores sin datos personales
- [ ] 17.3 Seguimiento de errores (por ejemplo Sentry; revisar el plan gratuito)
- [ ] 17.4 Alertas por correo ante caídas o errores repetidos
- [ ] 17.5 Revisar con `EXPLAIN` las consultas de agenda y calendario y ajustar índices
- [ ] 17.6 Prueba de carga ligera (k6) del cálculo de horarios y del alta de citas, incluida la competencia por un mismo horario
- [ ] 17.7 Lighthouse CI en el formulario del miembro (rendimiento y accesibilidad)
- [ ] 17.8 Límites de memoria y CPU del contenedor, y pruebas con esos límites
- [ ] 17.9 Copia de seguridad programada (`pg_dump` cifrado) como workflow
- [ ] 17.10 Prueba de restauración de una copia en una base vacía
- [ ] 17.11 Monitoreo de las conexiones a la base (pooler)
- [ ] 17.12 Lista de verificación mensual: dependencias, secretos, copias y usuarios activos

## Fase 18. Pruebas de aceptación y salida a producción

- [ ] 18.1 Pruebas de punta a punta (Playwright) del flujo del miembro: abrir el enlace, elegir, editar y cancelar
- [ ] 18.2 Pruebas de punta a punta del flujo del personal: crear, cancelar por consejero, reasignar y avisar
- [ ] 18.3 Prueba con el obispo y el secretario usando datos ficticios
- [ ] 18.4 Prueba en celulares reales (Android e iOS)
- [ ] 18.5 Revisión básica de accesibilidad (contraste, tamaños, teclado)
- [ ] 18.6 Importar el padrón real en producción
- [ ] 18.7 Crear los usuarios reales y entregar los enlaces de activación
- [ ] 18.8 Generar y enviar los primeros enlaces personales
- [ ] 18.9 Plan de contingencia si el sistema cae un martes (planilla manual de respaldo)
- [ ] 18.10 Lanzamiento gradual: primero un grupo pequeño de miembros
- [ ] 18.11 Recoger comentarios y priorizar ajustes

## Fase 19. Mejoras futuras (no bloquean el lanzamiento)

- [ ] 19.1 Recuperación de contraseña por correo
- [ ] 19.2 TOTP para el personal, si no se hizo antes
- [ ] 19.3 Integración con la API de la iglesia si algún día es oficial
- [ ] 19.4 Exportación de estadísticas
- [ ] 19.5 Recordatorios automáticos si algún día se justifica pagar un canal

## Decisiones pendientes

- D1: cómo marcar los contactos cargados a mano para que la importación no los pise (por ejemplo, un campo `contactEditedManually` en Member).
- D2: retención del historial (se sugirió unos 2 años) y uso de estadísticas por persona, a definir con el obispo.
- D3: marco legal de protección de datos (Ley 25.326) y si hace falta algún registro.
- D4: plataforma de despliegue: seguir con Vercel sin contenedores en producción o pasar a un servicio de contenedores o servidor propio para practicar el despliegue con Docker. Docker sigue siendo útil en desarrollo y en CI en ambos casos.

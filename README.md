# Sistema de agenda de entrevistas del obispado

Aplicación web responsiva para pedir, editar y cancelar entrevistas con el obispo o sus consejeros, con un dashboard de configuración para el obispado. Proyecto personal, no oficial.

El diseño completo está en el documento técnico y la lista de tareas del proyecto.

## Requisitos

- Node.js LTS (desarrollado con la versión 24) y npm
- Git
- OpenSSL (viene incluido con Git Bash en Windows)

## Puesta en marcha

1. Instalar dependencias (también activa los hooks de Git con Husky):

   ```bash
   npm install
   ```

2. Crear el archivo de variables de entorno a partir del ejemplo:

   ```bash
   cp .env.example .env.local
   ```

3. Completar `.env.local`. Los cuatro secretos se generan cada uno con:

   ```bash
   openssl rand -base64 32
   ```

   `DATABASE_URL` (conexión con pooler) y `DIRECT_URL` (conexión directa, para migraciones) apuntan a PostgreSQL.

4. Levantar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   La aplicación queda en <http://localhost:3000>.

Si falta una variable o tiene un formato inválido, la aplicación no arranca y el error indica cuál es (nunca muestra su valor).

## Variables de entorno

| Variable              | Para qué sirve                                             |
| --------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`        | Conexión a PostgreSQL con pooler (la usa la aplicación)    |
| `DIRECT_URL`          | Conexión directa a PostgreSQL (la usan las migraciones)    |
| `APP_ENCRYPTION_KEY`  | Clave AES-256-GCM (base64 de 32 bytes) para datos cifrados |
| `MEMBER_LINK_SECRET`  | Firma de los enlaces personales de los miembros            |
| `MEMBER_MATCH_SECRET` | Firma de las claves de coincidencia del padrón             |
| `SESSION_SECRET`      | Protección de las sesiones del personal                    |

Los cuatro secretos deben ser distintos entre sí. `.env.local` nunca se sube al repositorio. Guardar una copia de `APP_ENCRYPTION_KEY` en un gestor de contraseñas: sin ella no se pueden recuperar los datos cifrados.

## Scripts

| Comando                | Qué hace                                    |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | Servidor de desarrollo                      |
| `npm run build`        | Build de producción                         |
| `npm start`            | Sirve el build de producción                |
| `npm run lint`         | ESLint                                      |
| `npm run format`       | Formatea todo con Prettier                  |
| `npm run format:check` | Comprueba el formato sin modificar archivos |
| `npm test`             | Corre las pruebas una vez (Vitest)          |
| `npm run test:watch`   | Pruebas en modo observación                 |

## Normas de código

- TypeScript estricto con `noUncheckedIndexedAccess`; la regla `no-explicit-any` es un error.
- Datos externos como `unknown`, validados con Zod en los bordes.
- Funciones pequeñas, sin valores fijos en el código (constantes y mensajes en archivos propios).
- Reglas de negocio en el backend, dentro de `domain/` y `application/`.
- Al hacer commit, Husky ejecuta lint-staged (ESLint y Prettier sobre los archivos del commit) y commitlint valida el mensaje.
- Mensajes de commit con [Conventional Commits](https://www.conventionalcommits.org/): `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `ci`, `build`. Ejemplo: `feat(scheduling): generate slot grid`.

## Estructura

```
src/
  modules/
    interviews/ members/ leaders/ scheduling-config/ form-config/ auth/ stats/
      domain/          reglas puras, sin Prisma ni Next
      application/     casos de uso y puertos (interfaces)
      infrastructure/  adaptadores concretos (Prisma, CSV, cifrado)
      interfaces/      entrada: Server Actions, esquemas, mapeos
  shared/
    config/ constants/ errors/ validation/
  app/                 rutas de Next.js, delgadas
  composition-root.ts  único lugar donde se conectan los adaptadores
  instrumentation.ts   valida las variables de entorno al arrancar
```

ESLint impide que `domain/` importe Prisma, Next, React u otras capas, y que `application/` importe `infrastructure/` o `interfaces/`.

## Datos reales

Los archivos `.csv` y `.pdf` están excluidos de Git. El padrón real de miembros nunca debe subirse al repositorio ni quedar en carpetas sincronizadas; en desarrollo se usan datos ficticios.

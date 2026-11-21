/**
 * Raíz de composición.
 *
 * Es el ÚNICO lugar donde se instancian los adaptadores concretos
 * (repositorios Prisma, cifrado, reloj, fuente del padrón, etc.) y se
 * inyectan en los casos de uso. El resto del código solo conoce puertos
 * (interfaces) y nunca crea sus propias dependencias.
 *
 * Reglas:
 * - Solo ensambla: acá no hay reglas de negocio.
 * - Los adaptadores se crean una sola vez y se reutilizan.
 * - Las rutas, Server Actions y páginas piden sus casos de uso a este archivo.
 * - Las pruebas no lo usan: arman los casos de uso con dependencias falsas.
 * - Sin contenedor de dependencias: funciones y objetos simples.
 */

export {};

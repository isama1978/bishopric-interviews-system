import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const FRAMEWORK_IMPORTS = {
  paths: [
    { name: "next", message: "Esta capa no puede depender de Next." },
    { name: "react", message: "Esta capa no puede depender de React." },
    { name: "react-dom", message: "Esta capa no puede depender de React." },
    { name: "prisma", message: "Esta capa no puede depender de Prisma." },
  ],
  patterns: [
    { group: ["next/*"], message: "Esta capa no puede depender de Next." },
    { group: ["@prisma/*"], message: "Esta capa no puede depender de Prisma." },
  ],
};

const OUTER_LAYER_PATTERNS = (layers) =>
  layers.map((layer) => ({
    group: [`**/${layer}`, `**/${layer}/**`],
    message: `Esta capa no puede importar desde ${layer}.`,
  }));

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["src/modules/*/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: FRAMEWORK_IMPORTS.paths,
          patterns: [
            ...FRAMEWORK_IMPORTS.patterns,
            ...OUTER_LAYER_PATTERNS(["application", "infrastructure", "interfaces"]),
            {
              group: ["**/generated/prisma", "**/generated/prisma/**"],
              message: "Esta capa no puede depender de Prisma.",
            },
            {
              group: ["**/shared/database", "**/shared/database/**"],
              message: "Esta capa no puede acceder a la base de datos directamente.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/modules/*/application/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: FRAMEWORK_IMPORTS.paths,
          patterns: [
            ...FRAMEWORK_IMPORTS.patterns,
            ...OUTER_LAYER_PATTERNS(["infrastructure", "interfaces"]),
            {
              group: ["**/generated/prisma", "**/generated/prisma/**"],
              message: "Esta capa no puede depender de Prisma.",
            },
            {
              group: ["**/shared/database", "**/shared/database/**"],
              message: "Esta capa no puede acceder a la base de datos directamente.",
            },
          ],
        },
      ],
    },
  },
  prettier,
]);

export default eslintConfig;

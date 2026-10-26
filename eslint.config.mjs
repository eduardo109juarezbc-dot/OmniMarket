import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const NO_SPINNER_MESSAGE =
  "No se usan spinners: los estados de carga se muestran con <Skeleton> (lineamiento PDF §4).";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Requisito 13.2: skeletons en lugar de spinners genéricos.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name=/^(Spinner|Loader)$/]",
          message: NO_SPINNER_MESSAGE,
        },
        {
          selector: "Identifier[name=/^(Spinner|Loader)$/]",
          message: NO_SPINNER_MESSAGE,
        },
        {
          selector: "Literal[value=/\\banimate-spin\\b/]",
          message: NO_SPINNER_MESSAGE,
        },
        {
          selector: "TemplateElement[value.raw=/\\banimate-spin\\b/]",
          message: NO_SPINNER_MESSAGE,
        },
      ],
    },
  },

  // Arquitectura por capas: la presentación de cliente no importa la capa de servidor.
  {
    files: ["src/components/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server", "@/server/*", "**/server/*"],
              message: "Los componentes y hooks usan la API (lib/api-client), no src/server.",
            },
          ],
        },
      ],
    },
  },

  // El dominio puro (src/lib) no depende de otras capas.
  {
    files: ["src/lib/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server", "@/server/*", "@/components/*", "@/hooks/*", "@/app/*"],
              message: "src/lib es dominio puro y no importa otras capas.",
            },
          ],
        },
      ],
    },
  },

  globalIgnores([
    ".next/**",
    ".next-*/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "drizzle/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

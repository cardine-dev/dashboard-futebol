import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "node_modules/**",
    "generated/**",
    ".data/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // ~370 ocorrências herdadas: aviso (não erro) até a migração de tipos.
      "@typescript-eslint/no-explicit-any": "warn",
      // Regra nova do React Compiler. Os usos restantes são legítimos: hidratar
      // estado do localStorage no mount, medir o DOM (indicador da sidebar) e
      // resetar formulário quando um diálogo abre. Fica como aviso.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

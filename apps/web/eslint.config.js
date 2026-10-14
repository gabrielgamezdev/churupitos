import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist", "dev-dist", "src/routeTree.gen.ts"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
  },
  {
    // Los componentes de shadcn exportan sus variantes junto al componente
    // (`buttonVariants`), y cada archivo de rutas exporta su `Route`: son las
    // convenciones de shadcn y de TanStack Router, cuyo plugin ya separa el
    // componente para que la recarga en caliente funcione.
    files: ["src/components/ui/**/*.tsx", "src/routes/**/*.tsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
]);

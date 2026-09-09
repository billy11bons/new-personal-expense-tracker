import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "next-env.d.ts", "test-results/**", "playwright-report/**", ".test-profiles/**"]),
  {
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: ["react", "react/*", "next", "next/*", "@/data/*", "../data/*"] }],
      "no-restricted-globals": ["error", "window", "document", "localStorage", "sessionStorage", "fetch"],
    },
  },
]);

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    ".next/**",
    "dist/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    ".claude/**",
    "scripts/**/*.js",
    "scripts/**/*.mjs",
    "generate-readme.js",
    "vite.config.mjs",
    "next-env.d.ts",
    "src/App.jsx",
    "src/main.jsx",
    "src/**/*.js",
    "src/components/ui/**/*.jsx",
  ]),
]);

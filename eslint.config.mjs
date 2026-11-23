import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
    // Browser-audit scripts and screenshots (disposable, not in git)
    ".playwright-mcp/**", ".claude/**", ".superpowers/**",
    // A separate repository checked out inside this folder (not in git here)
    "garage-poker/**",
  ]),
]);

export default eslintConfig;

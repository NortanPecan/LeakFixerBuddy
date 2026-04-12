import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import security from "eslint-plugin-security";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [
  // ── Base configs ─────────────────────────────────────────
  ...nextCoreWebVitals,
  ...nextTypescript,

  // ── Security plugin ──────────────────────────────────────
  {
    plugins: { security },
    rules: {
      // detect-object-injection: off — notorious false-positive generator in TypeScript;
      // bracket-notation access on typed objects is safe; TS type system covers this.
      "security/detect-object-injection": "off",
      // detect-non-literal-regexp: off — too many false positives with string literals
      "security/detect-non-literal-regexp": "off",
      // detect-possible-timing-attacks: off — flags normal string comparisons
      "security/detect-possible-timing-attacks": "off",
      // detect-non-literal-fs-filename: off — no fs usage in this Next.js app
      "security/detect-non-literal-fs-filename": "off",
      // detect-non-literal-require: off — we use ESM imports
      "security/detect-non-literal-require": "off",
      // Keep only high-signal rules that catch real bugs:
      "security/detect-unsafe-regex": "warn",
      "security/detect-buffer-noassert": "error",
      "security/detect-child-process": "warn",
      "security/detect-disable-mustache-escape": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-new-buffer": "error",
      "security/detect-no-csrf-before-method-override": "error",
      "security/detect-pseudoRandomBytes": "warn",
    },
  },

  // ── Core rules ───────────────────────────────────────────
  {
    rules: {
      // ── TypeScript (promoted from off → warn) ────────────
      // Gradually tighten; move to "error" once codebase is clean
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Keep as off until explicit-any is cleaned up
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/ban-ts-comment": [
        "warn",
        {
          "ts-ignore": "allow-with-description",
          "ts-expect-error": "allow-with-description",
        },
      ],
      // Prefer const — important for correctness
      "prefer-const": "error",

      // ── React ────────────────────────────────────────────
      "react-hooks/exhaustive-deps": "warn", // promotes to warn; fixes bugs
      "react/no-unescaped-entities": "off", // too noisy in Russian UI
      "react/display-name": "off",
      "react/prop-types": "off",
      "react-compiler/react-compiler": "off",

      // ── Next.js ──────────────────────────────────────────
      "@next/next/no-img-element": "warn", // prefer <Image> for optimization
      "@next/next/no-html-link-for-pages": "off",

      // ── General JS quality ───────────────────────────────
      "no-console": ["warn", { allow: ["warn", "error"] }], // allow console.warn/error
      "no-debugger": "error",
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-unreachable": "error",
      "no-useless-escape": "warn",
      "no-irregular-whitespace": "error",
      "no-case-declarations": "warn",
      "no-fallthrough": "warn",
      "no-redeclare": "warn",

      // ── Off (too noisy / not applicable) ─────────────────
      "@typescript-eslint/prefer-as-const": "off",
      "@typescript-eslint/no-unused-disable-directive": "off",
      "react-hooks/purity": "off",
    },
  },

  // ── Ignore paths ─────────────────────────────────────────
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".claude/**",
      "out/**",
      "build/**",
      "coverage/**",
      "next-env.d.ts",
      "examples/**",
      "skills/**",
      "scripts/**",
    ],
  },
];

export default eslintConfig;

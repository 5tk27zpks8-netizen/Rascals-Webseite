import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      ".next/**",
      ".vinext/**",
      ".wrangler/**",
      "node_modules/**",
      "drizzle/**",
      "shopify-theme/**",
      ".claude/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "detect" } },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      "@next/next": nextPlugin,
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,

      // React 19 / App Router: kein React-Import nötig, JSX-Transform ist automatisch.
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",

      // Ungenutzte Variablen als Warnung, führende Unterstriche sind Absicht.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  // Worker-Code läuft in der Cloudflare-Runtime, nicht im Browser.
  {
    files: ["worker/**/*.ts", "db/**/*.ts", "build/**/*.ts"],
    languageOptions: { globals: globals.node },
  },
);

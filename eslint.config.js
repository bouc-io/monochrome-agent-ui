import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist", "coverage"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // Ratchet rules: counted against --max-warnings in CI and lowered over time.
      // Everything else stays an error and fails immediately. Kept deliberately in
      // step with the api-servers' eslint.config.mjs.
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      // shadcn/ui scaffolds empty interfaces that extend their base props type.
      "@typescript-eslint/no-empty-object-type": "warn",
    },
  },
  {
    // Root config files are CJS-flavoured by convention; tailwind.config.ts loads
    // its plugins with require(), which is how Tailwind and shadcn scaffold it.
    files: ["*.config.ts", "*.config.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Must stay last: turns off every stylistic rule that would fight prettier.
  prettier
);

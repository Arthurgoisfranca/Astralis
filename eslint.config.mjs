import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

const unused = ["error", { args: "after-used", argsIgnorePattern: "^_", caughtErrors: "none", ignoreRestSiblings: true }];
const common = {
  "no-unused-vars": unused,
  // Blocos catch vazios são intencionais (armazenamento indisponível, áudio bloqueado, campos de PDF opcionais).
  "no-empty": ["error", { allowEmptyCatch: true }],
  // Valores iniciais de "let" sobrescritos em todos os caminhos; não indica bug.
  "no-useless-assignment": "off",
};

export default [
  { ignores: ["dist/", "node_modules/", "data/", "semantic-review/", "src/**/*.ts"] },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx,mjs}"],
    languageOptions: { ecmaVersion: 2024, sourceType: "module", globals: globals.browser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...common,
      // Dívida técnica registrada em docs/DIAGNOSTICO.md: estado derivado copiado em efeitos.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    files: ["public/sw.js"],
    languageOptions: { ecmaVersion: 2024, sourceType: "script", globals: globals.serviceworker },
    rules: common,
  },
  {
    files: ["server.js", "server/**/*.js", "scripts/**/*.js", "tests/**/*.cjs"],
    languageOptions: { ecmaVersion: 2024, sourceType: "commonjs", globals: globals.node },
    rules: common,
  },
  {
    files: ["tests/**/*.mjs", "eslint.config.mjs", "vite.config.js"],
    languageOptions: { ecmaVersion: 2024, sourceType: "module", globals: globals.node },
    rules: common,
  },
];

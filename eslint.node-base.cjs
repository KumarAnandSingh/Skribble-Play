const path = require("node:path");

module.exports = function createNodeTsEslintConfig(options = {}) {
  const {
    tsconfigRootDir = process.cwd(),
    tsconfigPath = "./tsconfig.json",
    env = {},
    overrides = {}
  } = options;

  return {
    root: true,
    parser: "@typescript-eslint/parser",
    parserOptions: {
      project: [path.isAbsolute(tsconfigPath) ? tsconfigPath : path.join(tsconfigRootDir, tsconfigPath)],
      tsconfigRootDir,
      ecmaVersion: 2022,
      sourceType: "module"
    },
    plugins: ["@typescript-eslint"],
    extends: [
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended"
    ],
    env: {
      es2022: true,
      ...env
    },
    ignorePatterns: ["dist", "node_modules", "*.d.ts"],
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports", disallowTypeAnnotations: false }],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: false }],
      "no-console": "off",
      "no-constant-condition": ["error", { checkLoops: false }],
      semi: ["error", "always"],
      quotes: ["error", "double", { avoidEscape: true }],
      "comma-dangle": ["error", "never"],
      ...overrides
    }
  };
};

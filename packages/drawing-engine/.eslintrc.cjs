module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.json"],
  },
  plugins: ["@typescript-eslint"],
  extends: ["plugin:@typescript-eslint/recommended"],
  env: {
    es2022: true,
    node: true,
  },
  ignorePatterns: ["dist"],
  rules: {
    "@typescript-eslint/no-non-null-assertion": "off",
  },
};

module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.json"],
  },
  plugins: ["@typescript-eslint"],
  extends: ["plugin:@typescript-eslint/recommended"],
  env: {
    node: true,
    es2022: true,
  },
  ignorePatterns: ["dist"],
  rules: {
    "@typescript-eslint/explicit-module-boundary-types": "off",
  },
};

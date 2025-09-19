module.exports = {
  root: true,
  extends: ["standard-with-typescript"],
  parserOptions: {
    project: ["./tsconfig.json"],
  },
  env: {
    node: true,
    es2022: true,
  },
  ignorePatterns: ["dist"],
};

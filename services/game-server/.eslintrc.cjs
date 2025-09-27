const createConfig = require("../../eslint.node-base.cjs");

module.exports = createConfig({
  tsconfigRootDir: __dirname,
  env: { node: true },
  overrides: {
    "@typescript-eslint/no-floating-promises": "warn",
    "@typescript-eslint/no-misused-promises": ["warn", { checksVoidReturn: false }]
  }
});

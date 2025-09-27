const createConfig = require("../../eslint.node-base.cjs");

module.exports = createConfig({
  tsconfigRootDir: __dirname,
  env: { node: true },
  overrides: {
    "@typescript-eslint/explicit-module-boundary-types": "off"
  }
});

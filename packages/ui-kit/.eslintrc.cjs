const createConfig = require("../../eslint.node-base.cjs");

module.exports = createConfig({
  tsconfigRootDir: __dirname,
  env: { browser: true, node: true }
});

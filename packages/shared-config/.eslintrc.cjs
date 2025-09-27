const createConfig = require("../../eslint.node-base.cjs");

module.exports = createConfig({
  tsconfigRootDir: __dirname,
  env: { node: true }
});

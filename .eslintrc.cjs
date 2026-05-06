module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  ignorePatterns: ["node_modules/", "dist/"],
  rules: {
    "no-undef": "error",
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  }
};

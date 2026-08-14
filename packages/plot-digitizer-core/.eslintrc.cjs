// INFO: Dedicated ESLint config for the plot-digitizer-core package.
// Deliberately does NOT extend the root .eslintrc.cjs, which pulls in
// eslint-plugin-vue / eslint-plugin-vuetify — this package must stay
// framework-agnostic (see docs/design/plot-digitizer-architecture.md).
module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
  },
  extends: ['eslint:recommended', 'prettier', 'plugin:prettier/recommended'],
  plugins: ['prettier', '@typescript-eslint'],
  parser: '@typescript-eslint/parser',
  rules: {
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        semi: false,
      },
    ],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error'],
    complexity: ['error', { max: 20 }],
  },
  ignorePatterns: ['dist', '**/*.test.ts'],
}

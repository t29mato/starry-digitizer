module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: [
    'plugin:vue/essential',
    'eslint:recommended',
    // "@vue/typescript",
    'prettier',
    'plugin:prettier/recommended',
    'plugin:jest/recommended',
    'plugin:jest/style',
  ],
  plugins: ['prettier', '@typescript-eslint', 'jest'],
  parserOptions: {
    parser: '@typescript-eslint/parser',
  },
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
    // INFO: the base rule counts a TypeScript function overload signature as a
    // redeclaration of the implementation. The @typescript-eslint version
    // knows the difference; it still catches real redeclarations.
    'no-redeclare': 'off',
    '@typescript-eslint/no-redeclare': ['error'],
    complexity: ['error', { max: 20 }],
  },
  ignorePatterns: ['**/*.test.ts', '**/*.test.js'],
}

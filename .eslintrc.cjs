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
    'plugin:vuetify/base',
    // "plugin:jest/recommended",
    // "plugin:jest/style"
  ],
  plugins: [
    'prettier',
    '@typescript-eslint',
    // "jest"
  ],
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
  },
}

module.exports = {
  moduleFileExtensions: ['vue', 'js', 'ts', 'tsx'],
  moduleNameMapper: {
    '\\.(jpg|ico|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__mocks__/fileMock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  transform: {
    '^.+\\.(t|j)s?$': 'babel-jest',
    '^.+\\.vue$': '@vue/vue3-jest',
  },
  collectCoverageFrom: [
    'src/domain/**/*.ts',
    'src/application/**/*.ts',

    //FIXME: jest emits parse error when evaluating vue file
    // 'src/presentation/**/*.{vue,ts}',
    'src/presentation/**/*.ts',

    //exclude interfaces
    '!src/**/*Interface.ts',

    //exclude other unnecassary files
    '!src/presentation/components/**/*.ts',
  ],
}

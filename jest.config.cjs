module.exports = {
  moduleFileExtensions: ['vue', 'js', 'ts', 'tsx'],
  moduleNameMapper: {
    '\\.(jpg|ico|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__mocks__/fileMock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    // INFO: plot-digitizer-core is not npm-linked (see
    // docs/design/plot-digitizer-architecture.md Phase 0/1) — resolve it
    // straight to its TS source via alias instead.
    '^@plot-digitizer/core$':
      '<rootDir>/packages/plot-digitizer-core/src/index.ts',
  },
  preset: 'ts-jest',
  // INFO: packages/plot-digitizer-core has its own jest.config.cjs (node
  // env, ts-jest, its own coverage thresholds) and its own CI job
  // (.github/workflows/plot-digitizer-core-ci.yml) — exclude it here so it
  // isn't accidentally run twice under two different configs.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/packages/'],
  testEnvironment: 'jest-environment-jsdom',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
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

    //INFO: exclude interfaces
    '!src/**/*Interface.ts',
    //INFO: exclude ports (application-owned boundary interfaces, e.g.
    //CanvasStatePort — same rationale as *Interface.ts above: no runtime
    //logic to cover)
    '!src/**/*Port.ts',

    //INFO: index.ts in the components folder are just the collections of component modules
    '!src/presentation/components/**/index.ts',
  ],
}

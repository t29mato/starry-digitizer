module.exports = {
  preset: 'ts-jest',
  // INFO: node, not jsdom — this package must never depend on DOM/browser
  // globals. Any DOM access belongs in the host app's adapters (see
  // docs/design/plot-digitizer-architecture.md section 4).
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/**/*.test.ts',
    '!src/**/*Interface.ts',
  ],
  // INFO: Coverage gate agreed in the design-review response
  // (docs/design/plot-digitizer-architecture.md section 6):
  //   - core全体(domain+application) >= 90% がCIゲート
  //   - domain/models, domain/services は 95% を目標
  // Per-path thresholds for domain/models and domain/services are added in
  // Phase 1 once those directories contain real files — Jest errors out on
  // a threshold entry that matches zero files.
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
}

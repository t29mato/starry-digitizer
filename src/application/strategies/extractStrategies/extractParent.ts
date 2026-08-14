// INFO: Phase 1 (docs/design/plot-digitizer-architecture.md) — this class
// has been moved to packages/plot-digitizer-core. This file re-exports it so
// every existing
// `@/application/strategies/extractStrategies/extractParent` import in this
// app keeps working unchanged. Do not add logic here — edit the core
// package instead.
export { ExtractParent } from '@plot-digitizer/core'

// INFO: Phase 1 (docs/design/plot-digitizer-architecture.md) — this class
// has been moved to packages/plot-digitizer-core. This file re-exports it so
// every existing `@/application/services/magnifier/magnifier` (and relative
// `../magnifier`) import in this app keeps working unchanged. Do not add
// logic here — edit the core package instead.
export { Magnifier } from '@plot-digitizer/core'

// INFO: Phase 1 (docs/design/plot-digitizer-architecture.md) — this class
// has been moved to packages/plot-digitizer-core. This file re-exports it so
// every existing `@/domain/models/dataset/dataset` import in this app keeps
// working unchanged. Do not add logic here — edit the core package instead.
export { Dataset } from '@plot-digitizer/core'

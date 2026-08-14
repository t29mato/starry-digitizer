// INFO: Phase 1 (docs/design/plot-digitizer-architecture.md) — this
// interface has been moved to packages/plot-digitizer-core. This file
// re-exports it so every existing
// `@/application/services/confirmer/confirmerInterface` (and relative
// `../confirmerInterface`) import in this app keeps working unchanged. Do
// not add logic here — edit the core package instead.
export type { ConfirmerInterface } from '@plot-digitizer/core'

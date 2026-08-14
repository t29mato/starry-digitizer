// INFO: Phase 1 (docs/design/plot-digitizer-architecture.md) — this
// interface has been moved to packages/plot-digitizer-core. This file
// re-exports it so every existing
// `@/application/services/magnifier/magnifierInterface` (and relative
// `../magnifierInterface`) import in this app keeps working unchanged. Do
// not add logic here — edit the core package instead.
export type { MagnifierInterface } from '@plot-digitizer/core'

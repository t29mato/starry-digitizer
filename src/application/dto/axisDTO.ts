// INFO: Phase 3 (docs/design/plot-digitizer-architecture.md) — this type
// has been moved to packages/plot-digitizer-core. This file re-exports it
// so every existing `@/application/dto/axisDTO` import in this app keeps
// working unchanged. Do not add logic here — edit the core package instead.
export type { AxisDTO } from '@plot-digitizer/core'

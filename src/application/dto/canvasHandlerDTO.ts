// INFO: Phase 3 (docs/design/plot-digitizer-architecture.md) — this type
// has been moved to packages/plot-digitizer-core (named `CanvasStateDTO`
// there — core has no "CanvasHandler" concept, see
// packages/plot-digitizer-core/src/application/dto/canvasStateDTO.ts).
// Re-exported here under its original name so every existing
// `@/application/dto/canvasHandlerDTO` import in this app keeps working
// unchanged. Do not add logic here — edit the core package instead.
export type { CanvasStateDTO as CanvasHandlerDTO } from '@plot-digitizer/core'

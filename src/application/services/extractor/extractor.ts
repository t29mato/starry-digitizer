// INFO: Phase 2 (docs/design/plot-digitizer-architecture.md) — this class
// has been moved to packages/plot-digitizer-core, now that its dependency on
// CanvasHandlerInterface has been replaced with the DOM-agnostic
// PixelSourcePort. This file re-exports it so every existing
// `@/application/services/extractor/extractor` (and relative `../extractor`)
// import in this app keeps working unchanged. Do not add logic here — edit
// the core package instead.
export { Extractor } from '@plot-digitizer/core'

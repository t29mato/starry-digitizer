// INFO: Phase 2 (docs/design/plot-digitizer-architecture.md) — this
// interface has been moved to packages/plot-digitizer-core, now that its
// dependency on CanvasHandlerInterface has been replaced with the
// DOM-agnostic PixelSourcePort. This file re-exports it so every existing
// `@/application/services/extractor/extractorInterface` (and relative
// `../extractorInterface`) import in this app keeps working unchanged. Do
// not add logic here — edit the core package instead.
export type { ExtractorInterface } from '@plot-digitizer/core'

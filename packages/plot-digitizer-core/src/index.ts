// INFO: Public entry point of the "plot-digitizer" package.
//
// This is the confirmed Phase 4 facade
// (docs/design/plot-digitizer-architecture.md section 4.4): the full set of
// graph-image-digitizing logic ported out of starry-digitizer's
// domain/application layers across Phases 1-3, framework-agnostic and
// DOM-free. Not published to npm yet (see docs/design/
// plot-digitizer-architecture.md section 3-a for the criteria that would
// trigger a standalone-repo/publish proposal).
//
// What's intentionally NOT here:
//   - CanvasHandler, Interpolator: DOM/canvas-drawing services. They live in
//     the host app (src/presentation/services/) because mask *drawing* was
//     explicitly kept out of PixelSourcePort's scope (design doc section 8
//     item 3) — only pixel *reading* (BrowserPixelSourceAdapter) crossed
//     the boundary.
//   - ProjectService's ZIP/File/Blob handling: I/O, stays in the host app
//     (src/application/services/projectService/). Only the
//     ProjectDTO ⇄ domain-model conversion (SerializeProjectUseCase) is
//     here.
//   - AutoLineDigitizerService / HttpClientPort: the AI-assisted-extraction
//     feature was withdrawn from the product entirely (2026-08-15, backing
//     API went down) before it could be ported. A future from-scratch
//     reimplementation (internally called "deep-digitizer") would be
//     designed separately, not resumed from this code.
//
// The host app (starry-digitizer, src/) does not import this package by its
// npm name — it isn't published. It's resolved via a TS/bundler path alias
// (`@plot-digitizer/core`) straight to this file; see docs/design/
// plot-digitizer-architecture.md Phase 0/1 for why (in short: npm
// workspaces would require the repo root — itself the published
// `starry-digitizer` package — to become `private: true`, which was
// rejected).

// -- domain/models ------------------------------------------------------
export { Axis } from './domain/models/axis/axis'
export type { AxisInterface } from './domain/models/axis/axisInterface'
export { AxisSet } from './domain/models/axisSet/axisSet'
export type {
  AxisSetInterface,
  Vector,
} from './domain/models/axisSet/axisSetInterface'
export { Dataset } from './domain/models/dataset/dataset'
export type {
  DatasetInterface,
  Points,
} from './domain/models/dataset/datasetInterface'

// -- domain/services ------------------------------------------------------
export { default as AxisSetCalculator } from './domain/services/axisSetCalculator'

// -- shared domain types/constants ---------------------------------------
export type { Coord, Point, PointMode } from './domain/types'
export { POINT_MODE } from './domain/constants'

// -- application/strategies -----------------------------------------------
export { ExtractParent } from './application/strategies/extractStrategies/extractParent'
export type { default as ExtractStrategyInterface } from './application/strategies/extractStrategies/extractStrategyInterface'
export { default as LineExtract } from './application/strategies/extractStrategies/lineExtract'
export { default as SymbolExtractByArea } from './application/strategies/extractStrategies/symbolExtractByArea'

// -- application/utils ------------------------------------------------------
export { extractColorSwatches } from './application/utils/colorPaletteUtils'
export { getPointsTotalDistance } from './application/utils/pointsUtils'

// -- application/services ---------------------------------------------------
export { Magnifier } from './application/services/magnifier/magnifier'
export type { MagnifierInterface } from './application/services/magnifier/magnifierInterface'
export { Confirmer } from './application/services/confirmer/confirmer'
export type { ConfirmerInterface } from './application/services/confirmer/confirmerInterface'
export { Extractor } from './application/services/extractor/extractor'
export type { ExtractorInterface } from './application/services/extractor/extractorInterface'

// -- application/ports ------------------------------------------------------
export type { PixelSourcePort } from './application/ports/pixelSourcePort'

// -- application/useCases ---------------------------------------------------
export {
  SerializeProjectUseCase,
  type ToProjectDTOParams,
  type FromProjectDTOResult,
} from './application/useCases/serializeProjectUseCase'

// -- application/dto ---------------------------------------------------------
export type { AxisDTO } from './application/dto/axisDTO'
export type { AxisSetDTO } from './application/dto/axisSetDTO'
export type { DatasetDTO } from './application/dto/datasetDTO'
export type { CanvasStateDTO } from './application/dto/canvasStateDTO'
export type { ProjectDTO } from './application/dto/projectDTO'

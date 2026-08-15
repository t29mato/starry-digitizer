// INFO: Public entry point of the "plot-digitizer" package.
//
// Phase 1 (docs/design/plot-digitizer-architecture.md section 4.4) added
// classification-A code (pure domain models + DOM-free application pieces).
// Phase 2 added `PixelSourcePort` and moved `Extractor` onto it, now that it
// no longer needs the DOM-coupled CanvasHandlerInterface. CanvasHandler
// itself, Interpolator, ProjectService, and AutoLineDigitizerService remain
// host-app (or later-phase) concerns.
//
// The host app (starry-digitizer, src/) does not import this package by its
// npm name — it isn't published yet. It's resolved via a TS/bundler path
// alias (`@plot-digitizer/core`) straight to this file; see
// docs/design/plot-digitizer-architecture.md Phase 0/1 for why.

// -- domain/models --------------------------------------------------------
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

// -- domain/services --------------------------------------------------------
export { default as AxisSetCalculator } from './domain/services/axisSetCalculator'

// -- application/strategies -------------------------------------------------
export { ExtractParent } from './application/strategies/extractStrategies/extractParent'
export type { default as ExtractStrategyInterface } from './application/strategies/extractStrategies/extractStrategyInterface'
export { default as LineExtract } from './application/strategies/extractStrategies/lineExtract'
export { default as SymbolExtractByArea } from './application/strategies/extractStrategies/symbolExtractByArea'

// -- application/utils --------------------------------------------------------
export { extractColorSwatches } from './application/utils/colorPaletteUtils'
export { getPointsTotalDistance } from './application/utils/pointsUtils'

// -- application/services -------------------------------------------------
export { Magnifier } from './application/services/magnifier/magnifier'
export type { MagnifierInterface } from './application/services/magnifier/magnifierInterface'
export { Confirmer } from './application/services/confirmer/confirmer'
export type { ConfirmerInterface } from './application/services/confirmer/confirmerInterface'
export { Extractor } from './application/services/extractor/extractor'
export type { ExtractorInterface } from './application/services/extractor/extractorInterface'

// -- application/ports --------------------------------------------------------
export type { PixelSourcePort } from './application/ports/pixelSourcePort'

// -- shared domain types/constants -------------------------------------------
export type { Coord, Point, PointMode } from './domain/types'
export { POINT_MODE } from './domain/constants'

// -- Phase 0 scaffold (kept until nothing needs it) --------------------------
export { PACKAGE_NAME, getPackageInfo } from './packageInfo'

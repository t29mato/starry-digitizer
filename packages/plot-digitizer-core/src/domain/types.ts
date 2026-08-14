// INFO: Ported from src/@types/types.d.ts (starry-digitizer) as part of
// Phase 1 (docs/design/plot-digitizer-architecture.md). Only the types used
// by the classification-A domain/application code are included — ManualMode
// / MaskMode stay in the host app since they describe CanvasHandler (DOM)
// state, not the framework-agnostic core.
//
// INFO: lives in domain/ (not the package root) because these are the
// domain's own shared value types — application code depends inward on
// them, same as any other domain export (see the `core-domain-no-outward-
// dependency` dependency-cruiser rule in .dependency-cruiser.cjs).
import { POINT_MODE } from './constants'

export type PointMode = (typeof POINT_MODE)[keyof typeof POINT_MODE]

// INFO: Coord is coordinate
export type Coord = {
  xPx: number
  yPx: number
}
export type Point = {
  id: number
  xPx: number
  yPx: number
}

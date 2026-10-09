import { MANUAL_MODE, MASK_MODE, POINT_MODE } from '@/constants'

export type ManualMode = (typeof MANUAL_MODE)[keyof typeof MANUAL_MODE]
export type MaskMode = (typeof MASK_MODE)[keyof typeof MASK_MODE]
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
  // INFO: Only points that came from an auto-extraction import carry these
  // (see docs/design/auto-extraction-review-design.md). `origin` is the
  // point's position in the imported document and is what the edit log
  // diffs against, so anything that moves a point between datasets must
  // carry it along.
  origin?: PointOrigin
  score?: number
}
export type PointOrigin = {
  series: number
  index: number
}

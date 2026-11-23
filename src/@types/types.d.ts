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

// INFO: An axis-aligned rectangle in original-image pixels (top-left corner
// of the top-left pixel is the origin), e.g. the plot area or the legend of
// an AxisSet (docs/design/auto-extraction-review-design.md, "5.").
export type Rect = {
  xPx: number
  yPx: number
  widthPx: number
  heightPx: number
}

export type MarkerShape =
  | 'circle'
  | 'square'
  | 'diamond'
  | 'triangle-up'
  | 'triangle-down'
  | 'triangle-left'
  | 'triangle-right'
  | 'pentagon'
  | 'hexagon'
  | 'star'
  | 'cross'
  | 'plus'
  | 'other'

export type MarkerFill = 'filled' | 'open' | 'half' | 'other'

// INFO: How a dataset's markers look in the figure; every field optional
export type MarkerStyle = {
  shape?: MarkerShape
  fill?: MarkerFill
  sizePx?: number
}

// INFO: What the legend reader (F9, POST /legend) said about a dataset.
// `status`: 'auto' = the name was set from it; 'suggestion' = offered (a
// confidence of 0.3–0.5), not applied; 'accepted' = a person applied the
// suggestion. Kept as a record of where the name came from; the name itself
// stays the dataset's `name`, which a person may change at any time.
export type DatasetLegend = {
  label: string
  /** 0..1, the reader's heuristic; null if it gave none */
  confidence: number | null
  /** e.g. 'vlm' */
  source: string
  status: 'auto' | 'suggestion' | 'accepted'
}

export type SelectionShape = 'box' | 'lasso'
export type AnnotationTarget = 'plotArea' | 'legendArea'

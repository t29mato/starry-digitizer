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
}

export type AxisName = 'x1' | 'x2' | 'y1' | 'y2'

export type AxisValFormat =
  | 'scientificNotation'
  | 'powerNotation'
  | 'decimal'
  | 'invalidFormat'

export type AxisValState = {
  axisSetId: number
  displayedVal: {
    x1: string
    x2: string
    y1: string
    y2: string
  }
  displayedFormat: {
    x1: AxisValFormat
    x2: AxisValFormat
    y1: AxisValFormat
    y2: AxisValFormat
  }
}

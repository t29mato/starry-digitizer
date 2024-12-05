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

export type AxisKey = 'x1' | 'x2' | 'y1' | 'y2'

export type AxisValFormat =
  | 'scientificNotation'
  | 'powerNotation'
  | 'decimal'
  | 'invalidFormat'

export type AxisValFormatState = {
  axisSetId: number
  displayedFormat: {
    x1: AxisValFormat
    x2: AxisValFormat
    y1: AxisValFormat
    y2: AxisValFormat
  }
}

export type AxisValues = {
  x1: number
  x2: number
  y1: number
  y2: number
}

export type AxisValuesInput = {
  x1: string
  x2: string
  y1: string
  y2: string
}

type AxisValuesInputValidationStatus = {
  isInvalidInputFormat: {
    x1: boolean
    x2: boolean
    y1: boolean
    y2: boolean
  }
  isXLogScaleAndSameValue: boolean
  isXLogScaleAndZero: boolean
  isYLogScaleAndSameValue: boolean
  isYLogScaleAndZero: boolean
}

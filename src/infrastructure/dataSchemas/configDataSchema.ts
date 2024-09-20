import { PointMode, SemanticVersion } from '@/@types/types'

//NOTE: Add any information about StarryDigitizer configurations which is necassary to reconstruct the application states here.
export interface configDataSchema {
  schemaVersion: SemanticVersion
  figure: {
    scale: number
  }
  axisSets: {
    id: number
    pointMode: PointMode
    isVisible: boolean
    shouldConsiderGraphTilt: boolean
  }[]
  interpolator: {
    isActive: boolean
    interval: number
  }
  magnifier: {
    magnificationTimes: number
  }
  extractor: {
    strategy: 'Symbol Extract' | 'Line Extract'
    colorDiffThresholdPercent: number
    symbolExtraction: {
      minDiameterPx: number
      maxDiamiterPx: number
    }
    lineExtraction: {
      deltaXPx: number
      deltaYPx: number
    }
  }
}

import { PointMode, SemanticVersion } from '@/@types/types'

//NOTE: Add any information about StarryDigitizer configurations which is necassary to reconstruct the application states here.
//NOTE: Other interfaces have a prefix 'Interface' but this one doesn't have: It is intentional, mainly because this interface is kind of special one to just define data schema literally
export interface ConfigDataSchema {
  schemaVersion: SemanticVersion
  figure: {
    scale: number
  }
  axisSets: Array<{
    id: number
    pointMode: PointMode
    isVisible: boolean
    shouldConsiderGraphTilt: boolean
  }>
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

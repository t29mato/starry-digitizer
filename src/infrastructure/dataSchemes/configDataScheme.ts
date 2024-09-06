//NOTE: Add any information about StarryDigitizer configurations which is necassary to reconstruct the application states here.
export interface configDataScheme {
  schemeVersion: '0.1.0'
  figure: {
    scale: number
  }
  axisSets: {
    id: number
    pointMode: 0 | 1
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

export interface DetectedRegion {
  x: number
  y: number
  width: number
  height: number
  extractedText: string
  extractedValues: number[]
  axisPosition?: { x?: number; y?: number } // Store original axis position used for extraction
}

export interface OCRRegion {
  x: number
  y: number
  width: number
  height: number
  text: string
  type: 'x1' | 'x2' | 'y1' | 'y2' | 'other'
  centerX?: number // 重心のX座標
  centerY?: number // 重心のY座標
  axisPixelPosition?: number // 軸上のピクセル位置
  nearestTick?: TickMark // 最も近い目盛り
  originalRegion?: {
    // OCR推定時の元の領域（OpenCV精製前）
    x: number
    y: number
    width: number
    height: number
  }
}

export interface DetectedRectangle {
  x: number
  y: number
  width: number
  height: number
  score?: number
  isValid?: boolean
  areaRatio?: number
  skipped?: boolean
  maxGap?: number
  tolerance?: number
  solidity?: number
}

export interface TickMark {
  position: { x: number; y: number } // 目盛りの位置（線分の中点）
  startPoint: { x: number; y: number } // 線分の開始点
  endPoint: { x: number; y: number } // 線分の終了点
  length: number // 目盛りの長さ
  angle: number // 目盛りの角度（ラジアン）
  axisType?: 'horizontal' | 'vertical' // 属する軸のタイプ
  axisIntersection?: { x: number; y: number } // 軸との交点
}

export interface AxisExtractionResult {
  x1: number
  x2: number
  y1: number
  y2: number
  horizontalRegion?: DetectedRegion
  verticalRegion?: DetectedRegion
  plotArea?: {
    x: number
    y: number
    width: number
    height: number
  }
  ocrRegions?: OCRRegion[]
  tickMarks?: TickMark[] // 検出された目盛り
  axisPixelMapping?: {
    horizontal?: {
      x1Pixel: number
      x2Pixel: number
      pixelsPerUnit: number
    }
    vertical?: {
      y1Pixel: number
      y2Pixel: number
      pixelsPerUnit: number
    }
  }
  detectedRectangles?: DetectedRectangle[]
}

export interface DetectedAxis {
  horizontalAxis?: {
    x1: number
    x2: number
    y: number
  }
  verticalAxis?: {
    x: number
    y1: number
    y2: number
  }
  plotArea?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface AxisExtractorInterface {
  extractAxisInformation(
    imageData: ImageData,
  ): Promise<AxisExtractionResult | null>
  detectAxes(imageData: ImageData): Promise<DetectedAxis>
  extractTickValues(
    imageData: ImageData,
    axis: any,
    orientation: 'horizontal' | 'vertical',
  ): Promise<number[]>
}

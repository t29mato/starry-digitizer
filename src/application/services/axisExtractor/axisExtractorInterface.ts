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
  centerX?: number  // 重心のX座標
  centerY?: number  // 重心のY座標
  axisPixelPosition?: number  // 軸上のピクセル位置
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

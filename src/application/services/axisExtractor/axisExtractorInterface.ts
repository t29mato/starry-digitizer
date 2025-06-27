export interface DetectedRegion {
  x: number
  y: number
  width: number
  height: number
  extractedText: string
  extractedValues: number[]
}

export interface AxisExtractionResult {
  x1: number
  x2: number
  y1: number
  y2: number
  horizontalRegion?: DetectedRegion
  verticalRegion?: DetectedRegion
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

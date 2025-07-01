export interface ImageProcessingResult {
  text: string
  confidence: number
}

export interface RegionExtraction {
  text: string
  regions?: string[]
}

export interface AxisExtractorAdapter {
  // 画像読み込み
  loadImageFromFile?(filePath: string): Promise<any>
  loadImageFromCanvas?(canvas: any): Promise<any>

  // 軸検出（OpenCV処理）
  detectAxes(imageSource: any): Promise<{
    horizontalAxis?: { x1: number; x2: number; y: number }
    verticalAxis?: { x: number; y1: number; y2: number }
  }>

  // OCR処理
  extractTextFromRegion(
    imageSource: any,
    x: number,
    y: number,
    width: number,
    height: number,
    options?: {
      psm?: number
      enhanceContrast?: boolean
      applyThreshold?: boolean
    },
  ): Promise<ImageProcessingResult>

  // 複数領域でのOCR処理（改善版用）
  extractTextFromMultipleRegions?(
    imageSource: any,
    regions: Array<{
      x: number
      y: number
      width: number
      height: number
      psm?: number
    }>,
  ): Promise<RegionExtraction>

  // 環境判定
  isEnvironmentSupported(): boolean
  getEnvironmentName(): string
}

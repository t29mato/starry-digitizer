import {
  AxisExtractorInterface,
  AxisExtractionResult,
  DetectedAxis,
  DetectedRegion,
} from './axisExtractorInterface'
import {
  UnifiedAxisExtractor,
  UnifiedAxisExtractionOptions,
} from './unifiedAxisExtractor'

export class AxisExtractor implements AxisExtractorInterface {
  private unifiedExtractor: UnifiedAxisExtractor

  constructor(options: UnifiedAxisExtractionOptions = {}) {
    // Force browser adapter for backward compatibility
    this.unifiedExtractor = new UnifiedAxisExtractor({
      ...options,
      forceAdapter: 'browser',
    })
  }

  setDebug(debug: boolean): void {
    // Use the new setDebug method instead of recreating the extractor
    this.unifiedExtractor.setDebug(debug)
  }

  setLineTolerance(tolerance: number): void {
    this.unifiedExtractor.setLineTolerance(tolerance)
  }

  setColorThreshold(threshold: number): void {
    this.unifiedExtractor.setColorThreshold(threshold)
  }

  setMinAreaRatio(ratio: number): void {
    this.unifiedExtractor.setMinAreaRatio(ratio)
  }

  setUseColorThreshold(useColorThreshold: boolean): void {
    this.unifiedExtractor.setUseColorThreshold(useColorThreshold)
  }

  setMinSolidity(solidity: number): void {
    this.unifiedExtractor.setMinSolidity(solidity)
  }

  async extractAxisInformation(
    imageData: ImageData,
  ): Promise<AxisExtractionResult | null> {
    return await this.unifiedExtractor.extractAxisInformation(imageData)
  }

  async detectAxes(imageData: ImageData): Promise<DetectedAxis> {
    return await this.unifiedExtractor.detectAxes(imageData)
  }

  async extractTickValuesWithRegion(
    imageData: ImageData,
    axis: any,
    orientation: 'horizontal' | 'vertical',
  ): Promise<{ values: number[]; region: DetectedRegion }> {
    return await this.unifiedExtractor.extractTickValuesWithRegion(
      imageData,
      axis,
      orientation,
    )
  }

  async extractTickValues(
    imageData: ImageData,
    axis: any,
    orientation: 'horizontal' | 'vertical',
  ): Promise<number[]> {
    return await this.unifiedExtractor.extractTickValues(
      imageData,
      axis,
      orientation,
    )
  }
}

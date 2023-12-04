export interface CanvasInterface {
  isDrawnMask: boolean
  imageElement: HTMLImageElement
  scale: number
  get originalSizeMaskCanvasColors(): Uint8ClampedArray
  get originalImageCanvasColors(): Uint8ClampedArray

  clearInterpolationGuideCanvas(): void
}

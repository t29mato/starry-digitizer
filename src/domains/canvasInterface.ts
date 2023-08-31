export interface CanvasInterface {
  isDrawnMask: boolean
  scale: number
  get imageElement(): HTMLImageElement
  get originalSizeMaskCanvasColors(): Uint8ClampedArray
  get originalImageCanvasColors(): Uint8ClampedArray
}

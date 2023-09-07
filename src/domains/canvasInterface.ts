export interface CanvasInterface {
  isDrawnMask: boolean
  scale: number
  get originalSizeMaskCanvasColors(): Uint8ClampedArray
  get originalImageCanvasColors(): Uint8ClampedArray
}

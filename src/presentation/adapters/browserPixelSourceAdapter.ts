// INFO: Phase 2 (docs/design/plot-digitizer-architecture.md). Implements
// plot-digitizer-core's PixelSourcePort using the real DOM canvas — this is
// the code that used to live directly on CanvasHandler as
// `originalImageCanvasColors` / `originalSizeMaskCanvasColors` before the
// port was introduced. Scope is pixel *reading* only; mask *drawing* stays
// on CanvasHandler (design doc section 8 item 3).
import type { PixelSourcePort } from '@plot-digitizer/core'
import { HTMLCanvas } from '../dom/HTMLCanvas'
import type { CanvasHandlerInterface } from '../services/canvasHandler/canvasHandlerInterface'

export class BrowserPixelSourceAdapter implements PixelSourcePort {
  constructor(private canvasHandler: CanvasHandlerInterface) {}

  get width(): number {
    return this.canvasHandler.originalWidth
  }

  get height(): number {
    return this.canvasHandler.originalHeight
  }

  get isDrawnMask(): boolean {
    return this.canvasHandler.isDrawnMask
  }

  getImageColors(): Uint8ClampedArray {
    const canvas = document.createElement('canvas')
    canvas.width = this.width
    canvas.height = this.height
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    ctx.drawImage(
      this.canvasHandler.imageElement,
      0,
      0,
      this.width,
      this.height,
    )
    return ctx.getImageData(0, 0, this.width, this.height).data
  }

  getMaskColors(): Uint8ClampedArray {
    const canvas = document.createElement('canvas')
    canvas.width = this.width
    canvas.height = this.height
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    ctx.drawImage(
      new HTMLCanvas('maskCanvas').element,
      0,
      0,
      this.width,
      this.height,
    )
    return ctx.getImageData(0, 0, this.width, this.height).data
  }
}

import { InterpolatorCanvasInterface } from './InterpolatorCanvasInterface'
import { HTMLCanvas } from './HTMLCanvas'
import { Coord } from '@/@types/types'

// INFO: Holds the canvas-drawing logic that used to live in the application-
// layer Interpolator class. Injected into Interpolator by constructor
// injection so canvas/DOM concerns stay in the presentation layer. See #111.
export class InterpolatorCanvas implements InterpolatorCanvasInterface {
  public guideCanvas?: HTMLCanvas
  public magnifierCanvas?: HTMLCanvas

  public setGuideCanvas(guideCanvas: HTMLCanvas): void {
    this.guideCanvas = guideCanvas
  }

  public setMagnifierCanvas(magnifierCanvas: HTMLCanvas): void {
    this.magnifierCanvas = magnifierCanvas
  }

  public clearGuideCanvasContext(): void {
    if (!this.guideCanvas) {
      throw new Error('interpolator guide canvas is not set')
    }

    this.guideCanvas.context.clearRect(
      0,
      0,
      this.guideCanvas.element.width,
      this.guideCanvas.element.height,
    )
  }

  public clearMagnifierCanvasContext(): void {
    if (!this.magnifierCanvas) {
      throw new Error('interpolator magnifier canvas is not set')
    }

    this.magnifierCanvas.context.clearRect(
      0,
      0,
      this.magnifierCanvas.element.width,
      this.magnifierCanvas.element.height,
    )
  }

  public drawInterpolationLineOnGuideCanvas(
    coordsForGuideline: Coord[],
    scale: number,
  ): void {
    if (!this.guideCanvas) {
      throw new Error('interpolator guide canvas is not set')
    }

    this.clearGuideCanvasContext()

    this.guideCanvas.context.beginPath()

    this.guideCanvas.context.lineWidth = 3
    this.guideCanvas.context.strokeStyle = '#ffd700'
    this.guideCanvas.context.moveTo(
      coordsForGuideline[0].xPx * scale,
      coordsForGuideline[0].yPx * scale,
    )

    for (let i = 1; i < coordsForGuideline.length; i++) {
      this.guideCanvas.context.lineTo(
        coordsForGuideline[i].xPx * scale,
        coordsForGuideline[i].yPx * scale,
      )
    }

    this.guideCanvas.context.stroke()

    this.magnifierCanvas?.context.drawImage(
      this.guideCanvas.element,
      0,
      0,
      this.guideCanvas.element.width,
      this.guideCanvas.element.height,
    )
  }

  public resize(newWidth: number, newHeight: number): void {
    if (!this.guideCanvas || !this.magnifierCanvas) return

    this.guideCanvas.element.width = newWidth
    this.guideCanvas.element.height = newHeight

    this.magnifierCanvas.element.width = newWidth
    this.magnifierCanvas.element.height = newHeight

    this.magnifierCanvas.context.drawImage(
      this.guideCanvas.element,
      0,
      0,
      newWidth,
      newHeight,
    )
  }
}

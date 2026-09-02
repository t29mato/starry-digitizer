import { HTMLCanvas } from './HTMLCanvas'
import { InterpolatorCanvasInterface } from '@/application/services/interpolator/interpolatorCanvasInterface'
import { Coord } from '@/@types/types'

// INFO: docs/design/interpolator-canvas-separation.md 参照。
// Interpolator(application層)が直接HTMLCanvas/DOMを触っていたcanvas描画・
// クリア処理をこちらに集約し、Interpolatorへはinterface経由で注入する。
export class InterpolatorCanvas implements InterpolatorCanvasInterface {
  private guideCanvas?: HTMLCanvas
  private magnifierCanvas?: HTMLCanvas

  setGuideCanvas(guideCanvas: HTMLCanvas): void {
    this.guideCanvas = guideCanvas
  }

  setMagnifierCanvas(magnifierCanvas: HTMLCanvas): void {
    this.magnifierCanvas = magnifierCanvas
  }

  hasCanvas(): boolean {
    return !!this.guideCanvas && !!this.magnifierCanvas
  }

  clearGuideCanvasContext(): void {
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

  clearMagnifierCanvasContext(): void {
    if (!this.magnifierCanvas) {
      throw new Error('interpolator guide canvas is not set')
    }

    this.magnifierCanvas.context.clearRect(
      0,
      0,
      this.magnifierCanvas.element.width,
      this.magnifierCanvas.element.height,
    )
  }

  drawInterpolationLine(coords: Coord[], scale: number): void {
    if (!this.guideCanvas) {
      throw new Error('interpolator guide canvas is not set')
    }

    this.clearGuideCanvasContext()

    this.guideCanvas.context.beginPath()

    this.guideCanvas.context.lineWidth = 3
    this.guideCanvas.context.strokeStyle = '#ffd700'
    this.guideCanvas.context.moveTo(
      coords[0].xPx * scale,
      coords[0].yPx * scale,
    )

    for (let i = 1; i < coords.length; i++) {
      this.guideCanvas.context.lineTo(
        coords[i].xPx * scale,
        coords[i].yPx * scale,
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

  resize(newWidthPx: number, newHeightPx: number): void {
    if (!this.guideCanvas || !this.magnifierCanvas) return

    this.guideCanvas.element.width = newWidthPx
    this.guideCanvas.element.height = newHeightPx

    this.magnifierCanvas.element.width = newWidthPx
    this.magnifierCanvas.element.height = newHeightPx

    this.magnifierCanvas.context.drawImage(
      this.guideCanvas.element,
      0,
      0,
      newWidthPx,
      newHeightPx,
    )
  }
}

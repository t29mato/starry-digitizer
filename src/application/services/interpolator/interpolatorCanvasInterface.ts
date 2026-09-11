import { HTMLCanvas } from '@/application/canvas/HTMLCanvas'
import { Coord } from '@/@types/types'

// INFO: Interpolatorのcanvas描画・DOM操作をこのPort越しに抽象化する。
// docs/design/interpolator-canvas-separation.md 参照。
// 実装(InterpolatorCanvas)は application/canvas に置き、Interpolatorはこのinterfaceにのみ依存する。
export interface InterpolatorCanvasInterface {
  setGuideCanvas(guideCanvas: HTMLCanvas): void
  setMagnifierCanvas(magnifierCanvas: HTMLCanvas): void
  hasCanvas(): boolean
  clearGuideCanvasContext(): void
  clearMagnifierCanvasContext(): void
  drawInterpolationLine(coords: Coord[], scale: number): void
  resize(newWidthPx: number, newHeightPx: number): void
}

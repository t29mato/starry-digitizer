import { HTMLCanvas } from './HTMLCanvas'
import { Coord } from '@/@types/types'

export interface InterpolatorCanvasInterface {
  guideCanvas?: HTMLCanvas
  magnifierCanvas?: HTMLCanvas
  setGuideCanvas(guideCanvas: HTMLCanvas): void
  setMagnifierCanvas(magnifierCanvas: HTMLCanvas): void
  clearGuideCanvasContext(): void
  clearMagnifierCanvasContext(): void
  drawInterpolationLineOnGuideCanvas(
    coordsForGuideline: Coord[],
    scale: number,
  ): void
  resize(newWidth: number, newHeight: number): void
}

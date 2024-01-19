import { Coord } from '@/domain/datasetInterface'
import { HTMLCanvas } from '@/presentation/dom/HTMLCanvas'

export interface InterpolatorInterface {
  isActive: boolean
  interval: number
  interpolatedCoords: Coord[]
  interpolatedCoordsForGuideline: Coord[]
  guideCanvas?: HTMLCanvas
  magnifierCanvas?: HTMLCanvas
  initialize(): void
  setIsActive(isActive: boolean): void
  resizeCanvas(): void
  setGuideCanvas(guideCanvas: HTMLCanvas): void
  setMagnifierCanvas(magnifierCanvas: HTMLCanvas): void
  updateInterval(interval: number): void
  updatePreview(): void
  clearPreview(): void
}

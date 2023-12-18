import { Coord } from '@/domains/datasetInterface'
import { HTMLCanvas } from '@/domains/dom/HTMLCanvas'

export interface InterpolatorInterface {
  isActive: boolean
  interval: number
  interpolatedCoords: Coord[]
  interpolatedCoordsForGuideline: Coord[]
  guideCanvas?: HTMLCanvas
  initialize(): void
  setIsActive(isActive: boolean): void
  resizeGuideCanvas(): void
  setGuideCanvas(guideCanvas: HTMLCanvas): void
  updateInterval(interval: number): void
  updatePreview(): void
  clearPreview(): void
}

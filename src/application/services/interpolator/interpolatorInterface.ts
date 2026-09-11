import { Coord } from '@/@types/types'
import { HTMLCanvas } from '@/application/canvas/HTMLCanvas'

export interface InterpolatorInterface {
  isActive: boolean
  interval: number
  interpolatedCoords: Coord[]
  interpolatedCoordsForGuideline: Coord[]
  setIsActive(isActive: boolean): void
  resizeCanvas(): void
  setGuideCanvas(guideCanvas: HTMLCanvas): void
  setMagnifierCanvas(magnifierCanvas: HTMLCanvas): void
  updateInterval(interval: number): void
  updatePreview(): void
  clearPreview(): void
}

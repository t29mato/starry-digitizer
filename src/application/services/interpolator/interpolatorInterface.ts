import { Coord } from '@/@types/types'
import { HTMLCanvas } from '@/presentation/dom/HTMLCanvas'
import { IntervalUnit } from '@/application/utils/intervalUnitConverter'

export interface InterpolatorInterface {
  isActive: boolean
  interval: number
  intervalUnit: IntervalUnit
  interpolatedCoords: Coord[]
  interpolatedCoordsForGuideline: Coord[]
  guideCanvas?: HTMLCanvas
  magnifierCanvas?: HTMLCanvas
  get isDataUnitIntervalAvailable(): boolean
  initialize(): void
  setIsActive(isActive: boolean): void
  resizeCanvas(): void
  setGuideCanvas(guideCanvas: HTMLCanvas): void
  setMagnifierCanvas(magnifierCanvas: HTMLCanvas): void
  updateInterval(interval: number): void
  updateIntervalUnit(intervalUnit: IntervalUnit): void
  updatePreview(): void
  clearPreview(): void
}

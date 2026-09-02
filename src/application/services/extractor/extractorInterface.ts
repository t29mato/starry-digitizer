import { CanvasHandlerInterface } from '@/application/services/canvasHandler/canvasHandlerInterface'
import { Coord } from '@/@types/types'
import ExtractStrategyInterface from '@/application/strategies/extractStrategies/extractStrategyInterface'
import { AxisSetInterface } from '@/domain/models/axisSet/axisSetInterface'

export interface ExtractorInterface {
  strategy: ExtractStrategyInterface
  strategies: string[]
  colorPicker: string
  colors: { R: number; G: number; B: number }[][]
  colorDistancePct: number
  swatches: string[][]
  // INFO: when true (default) and the given axisSet is fully calibrated,
  // execute() filters out points outside the axes' pixel rectangle
  // (e.g. legend glyphs, tick labels). See issue #278.
  clipToAxes: boolean

  setColorDistancePct(colorDistancePct: number): void
  setStrategy(strategy: ExtractStrategyInterface): void
  setColorPicker(color: string): void
  setSwatches(colorSwatches: string[]): void
  setClipToAxes(clipToAxes: boolean): void

  execute(
    canvasHandler: CanvasHandlerInterface,
    axisSet?: AxisSetInterface,
  ): Coord[]

  get targetColor(): { R: number; G: number; B: number }
  get targetColorHex(): string
  updateSwatches(colorSwatches: string[]): void
}

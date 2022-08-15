import { Plots } from '@/types'
import { CanvasInterface } from './canvasInterface'
import ExtractStrategyInterface from './extractStrategies/extractStrategyInterface'

export type ExtractStrategy = 'Symbol Extract' | 'Line Extract'

export interface ExtractorInterface {
  strategy: ExtractStrategyInterface
  strategies: ExtractStrategy[]
  colorPicker: string
  colors: { R: number; G: number; B: number }[][]
  colorDistancePct: number
  swatches: string[][]

  execute(canvas: CanvasInterface): Plots

  get targetColor(): { R: number; G: number; B: number }
  get targetColorHex(): string
  updateSwatches(colorSwatches: string[]): void
}

import { PixelSource } from '@/application/ports/pixelSource'
import { Coord } from '@/@types/types'
import ExtractStrategyInterface from '@/application/strategies/extractStrategies/extractStrategyInterface'
import type LineExtract from '@/application/strategies/extractStrategies/lineExtract'
import type SymbolExtractByArea from '@/application/strategies/extractStrategies/symbolExtractByArea'

export interface ExtractorInterface {
  // INFO: per-extractor instances of the built-in strategies; the settings UI
  // binds to these, so extraction parameters never leak between two
  // <StarryDigitizer> instances on the same page.
  lineExtract: LineExtract
  symbolExtractByArea: SymbolExtractByArea
  strategy: ExtractStrategyInterface
  strategies: string[]
  colorPicker: string
  colors: { R: number; G: number; B: number }[][]
  colorDistancePct: number
  swatches: string[][]

  setColorDistancePct(colorDistancePct: number): void
  setStrategy(strategy: ExtractStrategyInterface): void
  setStrategyByName(name: string): void
  setColorPicker(color: string): void
  setSwatches(colorSwatches: string[]): void

  execute(source: PixelSource): Coord[]

  get targetColor(): { R: number; G: number; B: number }
  get targetColorHex(): string
  updateSwatches(colorSwatches: string[]): void
}

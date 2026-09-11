import { PixelSource } from '../../ports/pixelSource'

import { ExtractorInterface } from './extractorInterface'
import ExtractStrategyInterface from '../../strategies/extractStrategies/extractStrategyInterface'
import LineExtract from '../../strategies/extractStrategies/lineExtract'
import SymbolExtractByArea from '../../strategies/extractStrategies/symbolExtractByArea'
import { Coord } from '@/@types/types'

export class Extractor implements ExtractorInterface {
  // INFO: the built-in strategies are owned by the extractor, NOT process-wide
  // singletons. They carry mutable extraction settings (dxPx/dyPx,
  // min/maxDiameterPx), so sharing them would make two <StarryDigitizer>
  // instances on the same page overwrite each other's settings.
  // The UI reads and writes them through `ctx.extractor`.
  lineExtract: LineExtract
  symbolExtractByArea: SymbolExtractByArea
  strategy: ExtractStrategyInterface
  strategies: string[] = ['Symbol Extract', 'Line Extract']
  colorPicker = '#000000ff'
  colors = [] as { R: number; G: number; B: number }[][]
  colorDistancePct = 1
  swatches = [...Array(5)].map(() => []) as string[][]

  // INFO: `strategy` stays overridable so a host can drive `execute()` with a
  // strategy of its own; omitted, extraction starts on this extractor's own
  // Line Extract, as it always has.
  constructor(strategy?: ExtractStrategyInterface) {
    this.lineExtract = new LineExtract()
    this.symbolExtractByArea = new SymbolExtractByArea()
    this.strategy = strategy ?? this.lineExtract
  }

  setColorDistancePct(colorDistancePct: number): void {
    this.colorDistancePct = colorDistancePct
  }

  setStrategy(strategy: ExtractStrategyInterface): void {
    this.strategy = strategy
  }

  // INFO: the name -> strategy mapping lives here rather than in the settings
  // components, so the presentation layer never has to reach for a concrete
  // strategy class (and cannot accidentally reach for a shared one).
  setStrategyByName(name: string): void {
    switch (name) {
      case this.symbolExtractByArea.name:
        this.strategy = this.symbolExtractByArea
        break
      case this.lineExtract.name:
        this.strategy = this.lineExtract
    }
  }

  setColorPicker(color: string): void {
    this.colorPicker = color
  }

  setSwatches(colorSwatches: string[]): void {
    this.updateSwatches(colorSwatches)
  }

  // INFO: takes the `PixelSource` port, not the canvas handler, so extraction
  // has no canvas/DOM dependency of its own.
  execute(source: PixelSource): Coord[] {
    return this.strategy.execute(
      source.height,
      source.width,
      source.getImagePixels(),
      source.getMaskPixels(),
      source.hasMask,
      [this.targetColor.R, this.targetColor.G, this.targetColor.B],
      this.colorDistancePct,
    )
  }

  get targetColor(): { R: number; G: number; B: number } {
    return {
      R: parseInt(this.colorPicker.slice(1, 3), 16),
      G: parseInt(this.colorPicker.slice(3, 5), 16),
      B: parseInt(this.colorPicker.slice(5, 7), 16),
    }
  }
  get targetColorHex(): string {
    return (
      '#' +
      this.targetColor.R.toString(16) +
      this.targetColor.G.toString(16) +
      this.targetColor.B.toString(16)
    )
  }

  updateSwatches(colorSwatches: string[]) {
    this.swatches = [...Array(5)].map(() => [])
    colorSwatches.forEach((color, index) => {
      this.swatches[index % this.swatches.length].push(color)
    })
    this.colorPicker = colorSwatches[0]
  }
}

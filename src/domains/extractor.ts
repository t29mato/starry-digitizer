import { Canvas } from './canvas'
import ExtractStrategyInterface from './extractStrategies/ExtractStrategyInterface'
import LineExtract from './extractStrategies/LineExtract'
import SymbolExtractByArea from './extractStrategies/SymbolExtractByArea'

export type ExtractStrategy = 'Symbol Extract' | 'Line Extract'

export class Extractor {
  strategy: ExtractStrategyInterface = SymbolExtractByArea.instance
  strategies: ExtractStrategy[] = ['Symbol Extract', 'Line Extract']
  colorPicker = '#000000ff'
  colors = [] as { R: number; G: number; B: number }[][]
  colorDistancePct = 5
  swatches = [...Array(5)].map(() => []) as string[][]

  static #instance: Extractor
  static get instance(): Extractor {
    if (!this.#instance) {
      this.#instance = new Extractor()
    }
    return this.#instance
  }

  execute(
    canvas: Canvas,
    targetColor: [number, number, number],
    colorMatchThreshold: number
  ) {
    return this.strategy.execute(canvas, targetColor, colorMatchThreshold)
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

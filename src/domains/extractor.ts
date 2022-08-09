import { Canvas } from './canvas'
import ExtractStrategyInterface from './extractStrategies/ExtractStrategyInterface'
import LineExtract from './extractStrategies/LineExtract'
import SymbolExtractByArea from './extractStrategies/SymbolExtractByArea'

export type ExtractStrategy = 'Symbol Extract' | 'Line Extract'

export class Extractor {
  strategy: ExtractStrategyInterface = SymbolExtractByArea.instance
  strategies: ExtractStrategy[] = ['Symbol Extract', 'Line Extract']

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
}

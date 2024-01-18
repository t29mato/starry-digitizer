import { CanvasInterface } from '../../domains/canvasInterface'
import { Coord } from '../../domains/datasetInterface'
import { ExtractorInterface } from '../interfaces/extractorInterface'
import ExtractStrategyInterface from '../strategies/extractStrategies/extractStrategyInterface'
import LineExtract from '../strategies/extractStrategies/lineExtract'

export class Extractor implements ExtractorInterface {
  strategy: ExtractStrategyInterface
  strategies: string[] = ['Symbol Extract', 'Line Extract']
  colorPicker = '#000000ff'
  colors = [] as { R: number; G: number; B: number }[][]
  colorDistancePct = 5
  swatches = [...Array(5)].map(() => []) as string[][]

  private static instance: ExtractorInterface

  private constructor(strategy: ExtractStrategyInterface) {
    this.strategy = strategy
  }

  static getInstance(): ExtractorInterface {
    if (!this.instance) {
      this.instance = new Extractor(LineExtract.instance)
    }

    return this.instance
  }

  setColorDistancePct(colorDistancePct: number): void {
    this.colorDistancePct = colorDistancePct
  }

  setStrategy(strategy: ExtractStrategyInterface): void {
    this.strategy = strategy
  }

  setColorPicker(color: string): void {
    this.colorPicker = color
  }

  setSwatches(colorSwatches: string[]): void {
    this.updateSwatches(colorSwatches)
  }

  execute(canvas: CanvasInterface): Coord[] {
    return this.strategy.execute(
      canvas.imageElement.height,
      canvas.imageElement.width,
      canvas.originalImageCanvasColors,
      canvas.originalSizeMaskCanvasColors,
      canvas.isDrawnMask,
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

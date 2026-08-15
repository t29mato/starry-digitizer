import type { ExtractorInterface } from './extractorInterface'
import type ExtractStrategyInterface from '../../strategies/extractStrategies/extractStrategyInterface'
import type { PixelSourcePort } from '../../ports/pixelSourcePort'
import type { Coord } from '../../../domain/types'

export class Extractor implements ExtractorInterface {
  strategy: ExtractStrategyInterface
  strategies: string[] = ['Symbol Extract', 'Line Extract']
  colorPicker = '#000000ff'
  colors = [] as { R: number; G: number; B: number }[][]
  colorDistancePct = 1
  swatches = [...Array(5)].map(() => []) as string[][]

  constructor(strategy: ExtractStrategyInterface) {
    this.strategy = strategy
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

  execute(pixelSource: PixelSourcePort): Coord[] {
    return this.strategy.execute(
      pixelSource.height,
      pixelSource.width,
      pixelSource.getImageColors(),
      pixelSource.getMaskColors(),
      pixelSource.isDrawnMask,
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

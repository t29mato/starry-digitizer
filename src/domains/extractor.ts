import { Plots } from '@/types'
import { CanvasInterface } from './canvasInterface'
import ExtractStrategyInterface from './extractStrategies/ExtractStrategyInterface'

export type ExtractStrategy = 'Symbol Extract' | 'Line Extract'

export class Extractor {
  strategy: ExtractStrategyInterface
  strategies: ExtractStrategy[] = ['Symbol Extract', 'Line Extract']
  colorPicker = '#000000ff'
  colors = [] as { R: number; G: number; B: number }[][]
  colorDistancePct = 5
  swatches = [...Array(5)].map(() => []) as string[][]

  constructor(strategy: ExtractStrategyInterface) {
    this.strategy = strategy
  }

  execute(canvas: CanvasInterface): Plots {
    return this.strategy.execute(canvas, this)
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

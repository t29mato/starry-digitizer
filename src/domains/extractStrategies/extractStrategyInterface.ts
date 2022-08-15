import { Plot } from '@/types'
import { CanvasInterface } from '../canvasInterface'
import { ExtractorInterface } from '../extractorInterface'

// INFO: Strategy Pattern
export default interface ExtractStrategyInterface {
  name: string
  execute(
    height: number,
    width: number,
    imageColors: Uint8ClampedArray,
    maskColors: Uint8ClampedArray,
    isDrawnMask: boolean,
    targetColor: [number, number, number],
    colorMatchThreshold: number
  ): Plot[]
}

import { Plot } from '@/types'
import { CanvasInterface } from '../canvasInterface'

// INFO: Strategy Pattern
export default interface ExtractStrategyInterface {
  name: string
  execute(
    cm: CanvasInterface,
    targetColor: [number, number, number],
    colorMatchThreshold: number
  ): Plot[]
}

import { Plot } from '@/types'
import { Canvas } from '../canvas'

// INFO: Strategy Pattern
export default interface ExtractStrategyInterface {
  execute(
    cm: Canvas,
    targetColor: [number, number, number],
    colorMatchThreshold: number
  ): Plot[]
}

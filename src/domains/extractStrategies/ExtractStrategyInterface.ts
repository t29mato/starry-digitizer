import { Plot } from '@/types'
import { CanvasManager } from '../CanvasManager'

// INFO: Strategy Pattern
export default interface ExtractStrategyInterface {
  // TODO: CanvasManagerを直接渡す
  execute(
    cm: CanvasManager,
    targetColor: [number, number, number],
    colorMatchThreshold: number,
    isDrawnMask: boolean
  ): Plot[]
}

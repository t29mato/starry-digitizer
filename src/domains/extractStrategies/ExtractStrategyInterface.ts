import { Plot } from '@/types'

// INFO: Strategy Pattern
export default interface ExtractStrategyInterface {
  execute(
    height: number,
    width: number,
    graphCanvasColors: Uint8ClampedArray,
    targetRGB: [number, number, number],
    colorMatchThreshold: number,
    maskCanvasColors: Uint8ClampedArray,
    isDrawnMask: boolean
  ): Plot[]
}

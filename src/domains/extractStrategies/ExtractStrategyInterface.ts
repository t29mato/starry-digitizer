import { Plot } from '@/types'

export default interface ExtractStrategyInterface {
  execute(
    height: number,
    width: number,
    graphCanvasColors: Uint8ClampedArray,
    targetRGB: [number, number, number],
    colorMatchThreshold: number,
    isMasked: boolean,
    maskCanvasColors: Uint8ClampedArray,
  ): Plot[]
}

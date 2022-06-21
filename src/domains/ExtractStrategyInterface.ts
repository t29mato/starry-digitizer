import { Plot } from '@/types'

export default interface ExtractStrategyInterface {
  execute(
    height: number,
    width: number,
    graphCanvasColors: Uint8ClampedArray,
    maskCanvasColors: Uint8ClampedArray,
    isMasked: boolean,
    plotSizePx: number,
    plotRadiusSizePx: number,
    imageCanvasCtx: CanvasRenderingContext2D
  ): Plot[]
}

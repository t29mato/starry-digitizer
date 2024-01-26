import { Coord } from '@/domain/models/dataset/datasetInterface'

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
    colorMatchThreshold: number,
  ): Coord[]
}

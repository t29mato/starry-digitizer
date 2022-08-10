import { Plot } from '@/types'
import { CanvasInterface } from '../canvasInterface'
import { ExtractorInterface } from '../extractorInterface'

// INFO: Strategy Pattern
export default interface ExtractStrategyInterface {
  name: string
  execute(
    cm: CanvasInterface,
    extractor: ExtractorInterface
    // targetColor: [number, number, number],
    // colorMatchThreshold: number
  ): Plot[]
}

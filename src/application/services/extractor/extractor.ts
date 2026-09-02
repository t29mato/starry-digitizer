import { CanvasHandlerInterface } from '../canvasHandler/canvasHandlerInterface'

import { ExtractorInterface } from './extractorInterface'
import ExtractStrategyInterface from '../../strategies/extractStrategies/extractStrategyInterface'
import { Coord } from '@/@types/types'
import { AxisSetInterface } from '@/domain/models/axisSet/axisSetInterface'
import { getAxisSetPixelBoundingBox } from '@/domain/services/axisSetCalculator'

export class Extractor implements ExtractorInterface {
  strategy: ExtractStrategyInterface
  strategies: string[] = ['Symbol Extract', 'Line Extract']
  colorPicker = '#000000ff'
  colors = [] as { R: number; G: number; B: number }[][]
  colorDistancePct = 1
  swatches = [...Array(5)].map(() => []) as string[][]
  // INFO: default ON so newly extracted points can't include legend/label
  // glyphs outside the calibrated axes' pixel rectangle (issue #278)
  clipToAxes = true

  constructor(strategy: ExtractStrategyInterface) {
    this.strategy = strategy
  }

  setColorDistancePct(colorDistancePct: number): void {
    this.colorDistancePct = colorDistancePct
  }

  setStrategy(strategy: ExtractStrategyInterface): void {
    this.strategy = strategy
  }

  setColorPicker(color: string): void {
    this.colorPicker = color
  }

  setSwatches(colorSwatches: string[]): void {
    this.updateSwatches(colorSwatches)
  }

  setClipToAxes(clipToAxes: boolean): void {
    this.clipToAxes = clipToAxes
  }

  execute(
    canvasHandler: CanvasHandlerInterface,
    axisSet?: AxisSetInterface,
  ): Coord[] {
    const points = this.strategy.execute(
      canvasHandler.imageElement.height,
      canvasHandler.imageElement.width,
      canvasHandler.originalImageCanvasColors,
      canvasHandler.originalSizeMaskCanvasColors,
      canvasHandler.isDrawnMask,
      [this.targetColor.R, this.targetColor.G, this.targetColor.B],
      this.colorDistancePct,
    )

    if (!this.clipToAxes || !axisSet) {
      return points
    }

    // INFO: only clip when the axis set is fully calibrated; otherwise the
    // pixel rectangle is unknown and points are left untouched.
    const boundingBox = getAxisSetPixelBoundingBox(axisSet)
    if (!boundingBox) {
      return points
    }

    return points.filter(
      (point) =>
        point.xPx >= boundingBox.xPxMin &&
        point.xPx <= boundingBox.xPxMax &&
        point.yPx >= boundingBox.yPxMin &&
        point.yPx <= boundingBox.yPxMax,
    )
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

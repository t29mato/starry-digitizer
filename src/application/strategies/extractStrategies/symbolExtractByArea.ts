import ExtractStrategyInterface from './extractStrategyInterface'
import { ExtractParent } from './extractParent'
import { Coord } from '@/@types/types'
import {
  floodFillBlob,
  centroidOfPixels,
  diameterFromPixelCount,
} from '@/application/utils/symbolBlobDetection'

export default class SymbolExtractByArea
  extends ExtractParent
  implements ExtractStrategyInterface
{
  name = 'Symbol Extract'
  minDiameterPx = 5
  maxDiameterPx = 100

  static #instance: SymbolExtractByArea
  static get instance(): SymbolExtractByArea {
    if (!this.#instance) {
      this.#instance = new SymbolExtractByArea()
    }
    return this.#instance
  }
  constructor() {
    super()
  }

  execute(
    height: number,
    width: number,
    imageColors: Uint8ClampedArray,
    maskColors: Uint8ClampedArray,
    isDrawnMask: boolean,
    targetColor: [number, number, number],
    colorMatchThreshold: number,
  ) {
    const coords: Coord[] = []
    const visitedArea: boolean[][] = [...Array(height)].map(() =>
      Array(width).fill(false),
    )
    const bounds = {
      minX: 0,
      minY: 0,
      maxXExclusive: width,
      maxYExclusive: height,
    }
    if (isDrawnMask) {
      for (let h = 0; h < height; h++) {
        for (let w = 0; w < width; w++) {
          // const [r1, g1, b1, a1] = imageColors.slice(
          //   (h * width + w) * 4,
          //   (h * width + w + 1) * 4
          // )
          // if (this.#isWhite(r1, g1, b1, a1)) {
          //   visitedArea[h][w] = true
          //   continue
          // }
          const [r2, g2, b2, a2] = maskColors.slice(
            (h * width + w) * 4,
            (h * width + w + 1) * 4,
          )
          if (!this.isOnMask(r2, g2, b2, a2)) {
            visitedArea[h][w] = true
          }
        }
      }
    }

    // TODO: never usedのため一旦コメントアウトしている
    // let count = 0
    for (let h = 0; h < height; h++) {
      for (let w = 0; w < width; w++) {
        if (visitedArea[h][w]) {
          continue
        }
        const [r1, g1, b1] = imageColors.slice(
          (h * width + w) * 4,
          (h * width + w + 1) * 4,
        )
        const isMatch = this.matchColor(
          [r1, g1, b1],
          targetColor,
          colorMatchThreshold,
        )
        visitedArea[h][w] = true
        if (isMatch) {
          const pixels = floodFillBlob(
            w,
            h,
            width,
            imageColors,
            targetColor,
            colorMatchThreshold,
            visitedArea,
            bounds,
          )
          const diameter = diameterFromPixelCount(pixels.length)
          if (
            this.minDiameterPx <= diameter &&
            diameter <= this.maxDiameterPx
          ) {
            // To avoid gaps between calculation and rendering
            // INFO: In manual, pixels are limited to moving one pixel at a time.
            const offsetPx = 0.5
            const centroid = centroidOfPixels(pixels)
            coords.push({
              xPx: parseFloat((centroid.xPx + offsetPx).toFixed(1)),
              yPx: parseFloat((centroid.yPx + offsetPx).toFixed(1)),
            })
          }
        }
      }
    }
    return coords
  }

  setMinDiameterPx(minDiameterPx: number) {
    this.minDiameterPx = minDiameterPx
  }

  setMaxDiameterPx(maxDiameterPx: number) {
    this.maxDiameterPx = maxDiameterPx
  }
}

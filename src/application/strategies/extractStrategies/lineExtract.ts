import ExtractStrategyInterface from './extractStrategyInterface'
import { ExtractParent } from './extractParent'
import { Coord } from '@/@types/types'

export default class LineExtract
  extends ExtractParent
  implements ExtractStrategyInterface
{
  name = 'Line Extract'
  dxPx = 10
  dyPx = 10

  static #instance: LineExtract
  static get instance(): LineExtract {
    if (!this.#instance) {
      this.#instance = new LineExtract()
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
    // INFO: 線グラフは左から右なので横から探す
    for (let w = 0; w < width; w++) {
      for (let h = 0; h < height; h++) {
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
          const pixels: Coord[] = [
            {
              xPx: w,
              yPx: h,
            },
          ]
          let pixelsIndex = 0
          while (pixelsIndex < pixels.length) {
            // nh = next height, nw = next width
            for (
              let nh = pixels[pixelsIndex].yPx - 1;
              nh <= pixels[pixelsIndex].yPx + 1;
              nh++
            ) {
              for (
                let nw = pixels[pixelsIndex].xPx - 1;
                nw <= pixels[pixelsIndex].xPx + 1;
                nw++
              ) {
                if (nh < 0 || nw < 0 || nh >= height || nw >= width) {
                  continue
                }
                if (Math.abs(nw - w) > this.dxPx) {
                  continue
                }
                if (Math.abs(nh - h) > this.dyPx) {
                  continue
                }
                if (visitedArea[nh][nw]) {
                  continue
                }
                // count++
                const [r, g, b] = imageColors.slice(
                  (nh * width + nw) * 4,
                  (nh * width + nw + 1) * 4,
                )
                if (
                  this.matchColor([r, g, b], targetColor, colorMatchThreshold)
                ) {
                  pixels.push({
                    xPx: nw,
                    yPx: nh,
                  })
                  visitedArea[nh][nw] = true
                }
              }
            }
            pixelsIndex++
          }
          const xPxTotal = pixels.reduce((prev, cur) => {
            return prev + cur.xPx
          }, 0)
          const yPxTotal = pixels.reduce((prev, cur) => {
            return prev + cur.yPx
          }, 0)
          // To avoid gaps between calculation and rendering
          // INFO: In manual, pixels are limited to moving one pixel at a time.
          const offsetPx = 0.5
          // TODO: ここで桁数を指定する必要ない。表示時のみ対応でOK。
          coords.push({
            xPx: parseFloat((xPxTotal / pixels.length + offsetPx).toFixed(1)),
            yPx: parseFloat((yPxTotal / pixels.length + offsetPx).toFixed(1)),
          })
        }
      }
    }
    return coords
  }

  setDyPx(dyPx: number) {
    this.dyPx = dyPx
  }

  setDxPx(dxPx: number) {
    this.dxPx = dxPx
  }
}

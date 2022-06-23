import ExtractStrategyInterface from './ExtractStrategyInterface'
import diff from 'color-diff'
import { SymbolClass } from 'symbol2array'
import { Plot } from '@/types'

export default class SymbolExtractByArea implements ExtractStrategyInterface {
  symbol
  targetColor
  colorDistancePct

  constructor(
    symbol: SymbolClass,
    targetColor: { R: number; G: number; B: number },
    colorDistancePct: number
  ) {
    this.symbol = symbol
    this.targetColor = targetColor
    this.colorDistancePct = colorDistancePct
  }

  isWhite(r: number, g: number, b: number, a: number): boolean {
    return r === 255 && g === 255 && b === 255 && a > 0
  }

  // TODO: 背景色をスキップするか選択できるようにする
  isOnMask(r: number, g: number, b: number, a: number): boolean {
    return r === 255 && g === 255 && b === 0 && a > 0
  }

  matchShapeAndColor(colors: Uint8ClampedArray): boolean {
    const countColors = colors.length / 4
    const sideLength = Math.sqrt(countColors)
    const [rList, gList, bList] = [[], [], []] as number[][]
    const symbolArray = this.symbol.toArray().data
    for (let h = 0; h < sideLength; h++) {
      for (let w = 0; w < sideLength; w++) {
        if (!symbolArray[h][w]) {
          continue
        }
        rList.push(colors[(h * sideLength + w) * 4])
        gList.push(colors[(h * sideLength + w) * 4 + 1])
        bList.push(colors[(h * sideLength + w) * 4 + 2])
      }
    }
    const color = {
      R: rList.reduce((prev, cur) => prev + cur, 0) / rList.length,
      G: gList.reduce((prev, cur) => prev + cur, 0) / gList.length,
      B: bList.reduce((prev, cur) => prev + cur, 0) / bList.length,
    }
    return this.diffColor(color, this.targetColor) < this.colorDistancePct
  }

  diffColor(
    color1: { R: number; G: number; B: number },
    color2: { R: number; G: number; B: number }
  ): number {
    return diff.diff(diff.rgb_to_lab(color1), diff.rgb_to_lab(color2))
  }

  execute(
    height: number,
    width: number,
    graphCanvasColors: Uint8ClampedArray,
    maskCanvasColors: Uint8ClampedArray,
    isMasked: boolean,
    plotSizePx: number,
    plotRadiusSizePx: number,
    imageCanvasCtx: CanvasRenderingContext2D
  ) {
    const plots = []
    const visitedArea: boolean[][] = [...Array(height)].map(() =>
      Array(width).fill(false)
    )
    // for (let h = 0; h < height; h++) {
    //   for (let w = 0; w < width; w++) {
    //     const [r1, g1, b1, a1] = graphCanvasColors.slice(
    //       (h * width + w) * 4,
    //       (h * width + w + 1) * 4
    //     )
    //     if (this.isWhite(r1, g1, b1, a1)) {
    //       continue
    //     }
    //     const [r2, g2, b2, a2] = maskCanvasColors.slice(
    //       (h * width + w) * 4,
    //       (h * width + w + 1) * 4
    //     )
    //     if (isMasked && !this.isOnMask(r2, g2, b2, a2)) {
    //       continue
    //     }
    //     visitedArea[h][w] = true
    //   }
    // }

    let count = 0
    for (let h = 0; h < height; h++) {
      for (let w = 0; w < width; w++) {
        // INFO: 背景色白色はスキップ
        if (visitedArea[h][w]) {
          continue
        }
        const [r1, g1, b1, a1] = graphCanvasColors.slice(
          (h * width + w) * 4,
          (h * width + w + 1) * 4
        )
        const diffColor = this.diffColor(
          {
            R: r1,
            G: g1,
            B: b1,
          },
          this.targetColor
        )
        visitedArea[h][w] = true
        if (diffColor < 5) {
          const pixels: Plot[] = [
            {
              id: 0,
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
                if (nh <= 0 || nw <= 0 || nh >= height || nw >= width) {
                  continue
                }
                if (visitedArea[nh][nw]) {
                  continue
                }
                count++
                const [r, g, b] = graphCanvasColors.slice(
                  (nh * width + nw) * 4,
                  (nh * width + nw + 1) * 4
                )
                if (
                  this.diffColor(
                    {
                      R: r,
                      G: g,
                      B: b,
                    },
                    this.targetColor
                  ) < 5
                ) {
                  pixels.push({
                    id: pixels.length,
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
          plots.push({
            id: plots.length,
            xPx: xPxTotal / pixels.length,
            yPx: yPxTotal / pixels.length,
          })
        }
      }
    }
    console.log(plots)
    console.log({ count })
    console.log({ visitedArea })

    return plots
  }
}

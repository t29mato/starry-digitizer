import ExtractStrategyInterface from './ExtractStrategyInterface'
import diff from 'color-diff'
import { SymbolClass } from 'symbol2array'
import { Plot } from '@/types'

export default class SymbolExtractByArea implements ExtractStrategyInterface {
  isWhite(r: number, g: number, b: number, a: number): boolean {
    return r === 255 && g === 255 && b === 255 && a > 0
  }

  // TODO: 背景色をスキップするか選択できるようにする
  isOnMask(r: number, g: number, b: number, a: number): boolean {
    return r === 255 && g === 255 && b === 0 && a > 0
  }

  diffColor(
    color1: { R: number; G: number; B: number },
    color2: { R: number; G: number; B: number }
  ): number {
    return diff.diff(diff.rgb_to_lab(color1), diff.rgb_to_lab(color2))
  }

  matchColor(
    rgb1: [number, number, number],
    rgb2: [number, number, number],
    matchRatio: number
  ) {
    const diffRatio =
      rgb1.reduce((prev, _, i) => {
        return prev + Math.pow(rgb1[i] - rgb2[i], 2)
      }, 0) /
      (Math.pow(255, 2) * 3) * 100
    return diffRatio < matchRatio
  }

  execute(
    height: number,
    width: number,
    graphCanvasColors: Uint8ClampedArray,
    targetRGB: [number, number, number],
    colorMatchThreshold: number,
    isMasked: boolean,
    maskCanvasColors: Uint8ClampedArray,
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
        const isMatch = this.matchColor([r1,g1,b1], targetRGB, colorMatchThreshold)
        visitedArea[h][w] = true
        if (isMatch) {
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
                if (nh < 0 || nw < 0 || nh >= height || nw >= width) {
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
                  this.matchColor([r,g,b], targetRGB, colorMatchThreshold)
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

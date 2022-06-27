import ExtractStrategyInterface from './ExtractStrategyInterface'
import diff from 'color-diff'
import { Plot, DiameterRange } from '@/types'

export default class SymbolExtractByArea implements ExtractStrategyInterface {
  minDiameterPx = 5
  maxDiameterPx = 100

  setDiameter(diameterRange: DiameterRange) {
    this.minDiameterPx = diameterRange.min
    this.maxDiameterPx = diameterRange.max
  }

  #isWhite(r: number, g: number, b: number, a: number): boolean {
    return r === 255 && g === 255 && b === 255 && a > 0
  }

  // TODO: 背景色をスキップするか選択できるようにする
  #isOnMask(r: number, g: number, b: number, a: number): boolean {
    return r === 255 && g === 255 && b === 0 && a > 0
  }

  #diffColor(
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
      (rgb1.reduce((prev, _, i) => {
        return prev + Math.pow(rgb1[i] - rgb2[i], 2)
      }, 0) /
        (Math.pow(255, 2) * 3)) *
      100
    return diffRatio < matchRatio
  }

  execute(
    height: number,
    width: number,
    graphCanvasColors: Uint8ClampedArray,
    targetRGB: [number, number, number],
    colorMatchThreshold: number,
    maskCanvasColors: Uint8ClampedArray,
    isDrawnMask: boolean
  ) {
    const plots = []
    const visitedArea: boolean[][] = [...Array(height)].map(() =>
      Array(width).fill(false)
    )
    if (isDrawnMask) {
      for (let h = 0; h < height; h++) {
        for (let w = 0; w < width; w++) {
          // const [r1, g1, b1, a1] = graphCanvasColors.slice(
          //   (h * width + w) * 4,
          //   (h * width + w + 1) * 4
          // )
          // if (this.#isWhite(r1, g1, b1, a1)) {
          //   visitedArea[h][w] = true
          //   continue
          // }
          const [r2, g2, b2, a2] = maskCanvasColors.slice(
            (h * width + w) * 4,
            (h * width + w + 1) * 4
          )
          if (!this.#isOnMask(r2, g2, b2, a2)) {
            visitedArea[h][w] = true
          }
        }
      }
    }

    let count = 0
    for (let h = 0; h < height; h++) {
      for (let w = 0; w < width; w++) {
        if (visitedArea[h][w]) {
          continue
        }
        const [r1, g1, b1, a1] = graphCanvasColors.slice(
          (h * width + w) * 4,
          (h * width + w + 1) * 4
        )
        const isMatch = this.matchColor(
          [r1, g1, b1],
          targetRGB,
          colorMatchThreshold
        )
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
                  this.matchColor([r, g, b], targetRGB, colorMatchThreshold)
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
          const area = pixels.length
          // area = πr^2
          // r = √(area / π)
          // diameter = r * 2
          const diameter = Math.sqrt(area / Math.PI) * 2
          if (
            this.minDiameterPx <= diameter &&
            diameter <= this.maxDiameterPx
          ) {
            // To avoid gaps between calculation and rendering
            // INFO: In manual, pixels are limited to moving one pixel at a time.
            const offsetPx = 0.5
            plots.push({
              id: plots.length,
              xPx: parseFloat((xPxTotal / pixels.length + offsetPx).toFixed(1)),
              yPx: parseFloat((yPxTotal / pixels.length + offsetPx).toFixed(1)),
            })
          }
        }
      }
    }
    return plots
  }
}

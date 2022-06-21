import ExtractStrategyInterface from './ExtractStrategyInterface'
import diff from 'color-diff'
import { SymbolClass } from 'symbol2array'
import { Plot } from '@/types'

export default class SymbolExtractStrategy implements ExtractStrategyInterface {
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
    const plots: Plot[] = []
    const targetArea = [...Array(height)].map(() => Array(width).fill(false))
    for (let h = 0; h < height; h++) {
      for (let w = 0; w < width; w++) {
        const [r1, g1, b1, a1] = graphCanvasColors.slice(
          (h * width + w) * 4,
          (h * width + w + 1) * 4
        )
        if (this.isWhite(r1, g1, b1, a1)) {
          continue
        }
        const [r2, g2, b2, a2] = maskCanvasColors.slice(
          (h * width + w) * 4,
          (h * width + w + 1) * 4
        )
        if (isMasked && !this.isOnMask(r2, g2, b2, a2)) {
          continue
        }
        targetArea[h][w] = true
      }
    }

    for (let h = plotSizePx; h < Math.floor(height); h++) {
      for (let w = plotSizePx; w < Math.floor(width); w++) {
        // INFO: 背景色白色はスキップ
        if (!targetArea[h][w]) {
          continue
        }
        const imageData = imageCanvasCtx.getImageData(
          w - plotRadiusSizePx,
          h - plotRadiusSizePx,
          plotSizePx,
          plotSizePx
        ).data
        if (this.matchShapeAndColor(imageData)) {
          plots.push({
            id: plots.length + 1,
            xPx: w,
            yPx: h,
          })
          for (let i = 0; i < plotSizePx; i++) {
            for (let j = 0; j < plotSizePx; j++) {
              if (i + j === 0) {
                continue
              }
              targetArea[h + j][w - i] = false
              targetArea[h + j][w + i] = false
            }
          }
        }
      }
    }
    return plots
  }
}

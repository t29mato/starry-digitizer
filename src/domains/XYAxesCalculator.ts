import { axesPosList, Position } from '@/types'

export default class XYAxesCalculator {
  // INFO: 画像のサイズが1,000pxで1px未満の細かい調整はできず分解能4桁と考えたため
  effectiveDigits: number = 4

  private axesPosList: axesPosList
  private isLog: { x: boolean; y: boolean }
  constructor(axesPosList: axesPosList, isLog: { x: boolean; y: boolean }) {
    this.axesPosList = axesPosList
    this.isLog = isLog
  }
  calculateXYValues(x: number, y: number): { xV: string; yV: string } {
    // INFO: 点x1と点x2を通る直線が、点tと垂直に交わる点の(x,y)値を計算
    const calculateVerticalCrossPoint = (
      x1x: number,
      x1y: number,
      x2x: number,
      x2y: number,
      tx: number,
      ty: number
    ): { x: number; y: number } => {
      const isParallel = x2y - x1y === 0
      const isVertical = x2x - x1x === 0
      const x = isParallel
        ? tx
        : (x2x * x1y * (x1y - x2y - ty) +
            x1x * x2y * (x2y - x1y - ty) +
            tx * (x2x - x1x) ** 2 +
            ty * (x1x * x1y + x2x * x2y)) /
          ((x2x - x1x) ** 2 + (x2y - x1y) ** 2)
      // INFO: a1 = x1x, a2 = x2x, b1 = x1y, b2 = x2y
      const y = isVertical
        ? ty
        : ((x2y - x1y) * x + x2x * x1y - x1x * x2y) / (x2x - x1x)
      return { x, y }
    }
    const [x1x, x1y, x2x, x2y, x1v, x2v, y1x, y1y, y2x, y2y, y1v, y2v] = [
      this.axesPosList.x1.xPx,
      this.axesPosList.x1.yPx,
      this.axesPosList.x2.xPx,
      this.axesPosList.x2.yPx,
      this.axesPosList.x1.value,
      this.axesPosList.x2.value,
      this.axesPosList.y1.xPx,
      this.axesPosList.y1.yPx,
      this.axesPosList.y2.xPx,
      this.axesPosList.y2.yPx,
      this.axesPosList.y1.value,
      this.axesPosList.y2.value,
    ]
    const xPx = calculateVerticalCrossPoint(x1x, x1y, x2x, x2y, x, y).x
    const yPx = calculateVerticalCrossPoint(y1x, y1y, y2x, y2y, x, y).y
    const xV = this.isLog.x
      ? Math.pow(
          10,
          ((xPx - x1x) / (x2x - x1x)) * (Math.log10(x2v) - Math.log10(x1v)) +
            Math.log10(x1v)
        )
      : ((xPx - x1x) / (x2x - x1x)) * (x2v - x1v) + x1v
    const yV = this.isLog.y
      ? Math.pow(
          10,
          ((yPx - y1y) / (y2y - y1y)) * (Math.log10(y2v) - Math.log10(y1v)) +
            Math.log10(y1v)
        )
      : ((yPx - y1y) / (y2y - y1y)) * (y2v - y1v) + y1v
    return {
      xV: parseFloat(
        xV.toPrecision(this.additionalEffectiveDigits())
      ).toExponential(),
      yV: parseFloat(
        yV.toPrecision(this.additionalEffectiveDigits())
      ).toExponential(),
    }
  }

  private numDigit(num: number): number {
    return Math.floor(Math.log10(Math.abs(num)))
  }

  private additionalEffectiveDigits(): number {
    return (
      this.numDigit(this.axesPosList.x2.value) -
      this.numDigit(this.axesPosList.x2.value - this.axesPosList.x1.value) +
      this.effectiveDigits
    )
  }
}

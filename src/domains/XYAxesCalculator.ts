import { AxesInterface } from './axes/axesInterface'

export default class XYAxesCalculator {
  // INFO: 画像のサイズが1,000pxで1px未満の細かい調整はできず分解能4桁と考えたため
  effectiveDigits: number = 4

  #axes: AxesInterface
  #isLog: { x: boolean; y: boolean }
  constructor(axes: AxesInterface, isLog: { x: boolean; y: boolean }) {
    this.#axes = axes
    this.#isLog = isLog
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
    if (
      !(
        this.#axes.x1.coord &&
        this.#axes.x2.coord &&
        this.#axes.y1.coord &&
        this.#axes.y2.coord
      )
    ) {
      return { xV: 'NaN', yV: 'NaN' }
    }
    if (
      this.#axes.x1.value === this.#axes.x2.value ||
      this.#axes.y1.value === this.#axes.y2.value
    ) {
      return { xV: 'NaN', yV: 'NaN' }
    }

    const [x1x, x1y, x2x, x2y, x1v, x2v, y1x, y1y, y2x, y2y, y1v, y2v] = [
      this.#axes.x1.coord.xPx,
      this.#axes.x1.coord.yPx,
      this.#axes.x2.coord.xPx,
      this.#axes.x2.coord.yPx,
      this.#axes.x1.value,
      this.#axes.x2.value,
      this.#axes.y1.coord.xPx,
      this.#axes.y1.coord.yPx,
      this.#axes.y2.coord.xPx,
      this.#axes.y2.coord.yPx,
      this.#axes.y1.value,
      this.#axes.y2.value,
    ]
    const xPx = calculateVerticalCrossPoint(x1x, x1y, x2x, x2y, x, y).x
    const yPx = calculateVerticalCrossPoint(y1x, y1y, y2x, y2y, x, y).y
    const xV = this.#isLog.x
      ? Math.pow(
          10,
          ((xPx - x1x) / (x2x - x1x)) * (Math.log10(x2v) - Math.log10(x1v)) +
            Math.log10(x1v)
        )
      : ((xPx - x1x) / (x2x - x1x)) * (x2v - x1v) + x1v
    const yV = this.#isLog.y
      ? Math.pow(
          10,
          ((yPx - y1y) / (y2y - y1y)) * (Math.log10(y2v) - Math.log10(y1v)) +
            Math.log10(y1v)
        )
      : ((yPx - y1y) / (y2y - y1y)) * (y2v - y1v) + y1v
    const xEffectiveDigits = this.calculateEffectiveDigits(
      this.#axes.x2.value,
      this.#axes.x1.value
    )
    const yEffectiveDigits = this.calculateEffectiveDigits(
      this.#axes.y2.value,
      this.#axes.y1.value
    )
    const xPrecised = parseFloat(xV.toPrecision(xEffectiveDigits))
    const yPrecised = parseFloat(yV.toPrecision(yEffectiveDigits))
    const xExponential = xPrecised.toExponential()
    const yExponential = yPrecised.toExponential()
    return {
      xV: xExponential,
      yV: yExponential,
    }
  }

  numDigit(num: number): number {
    if (num === 0) {
      return 0
    }
    return Math.floor(Math.log10(Math.abs(num)))
  }

  // 88.81 - 88.71 = 0.10
  calculateEffectiveDigits(upper: number, lower: number): number {
    return (
      Math.abs(this.numDigit(upper) - this.numDigit(upper - lower)) +
      this.effectiveDigits
    )
  }
}

//INFO: implementing this class because this calculation logics hand XY values over to the dataset domain, using the states of XYAxisSet domain (handling multiple domain models)
import { XYAxisSetInterface } from '../models/XYAxisSet/XYAxisSetInterface'

export default class XYAxisSetCalculator {
  // INFO: 画像のサイズが1,000pxで1px未満の細かい調整はできず分解能4桁と考えたため
  effectiveDigits: number = 4

  #XYAxisSet: XYAxisSetInterface
  #isLog: { x: boolean; y: boolean }
  constructor(
    XYAxisSet: XYAxisSetInterface,
    isLog: { x: boolean; y: boolean },
  ) {
    this.#XYAxisSet = XYAxisSet
    this.#isLog = isLog
  }
  calculateXYValues(xt: number, yt: number): { xV: string; yV: string } {
    if (
      !(
        this.#XYAxisSet.x1.coord &&
        this.#XYAxisSet.x2.coord &&
        this.#XYAxisSet.y1.coord &&
        this.#XYAxisSet.y2.coord
      )
    ) {
      return { xV: 'NaN', yV: 'NaN' }
    }
    if (
      this.#XYAxisSet.x1.value === this.#XYAxisSet.x2.value ||
      this.#XYAxisSet.y1.value === this.#XYAxisSet.y2.value
    ) {
      return { xV: 'NaN', yV: 'NaN' }
    }

    const [xa, ya, xb, yb, a, b, xc, yc, xd, yd, c, d] = [
      this.#XYAxisSet.x1.coord.xPx,
      this.#XYAxisSet.x1.coord.yPx,
      this.#XYAxisSet.x2.coord.xPx,
      this.#XYAxisSet.x2.coord.yPx,
      this.#XYAxisSet.x1.value,
      this.#XYAxisSet.x2.value,
      this.#XYAxisSet.y1.coord.xPx,
      this.#XYAxisSet.y1.coord.yPx,
      this.#XYAxisSet.y2.coord.xPx,
      this.#XYAxisSet.y2.coord.yPx,
      this.#XYAxisSet.y1.value,
      this.#XYAxisSet.y2.value,
    ]
    let xp = xt
    let yq = yt
    if (this.#XYAxisSet.considerGraphTilt) {
      const xab = xb - xa
      const yab = yb - ya
      const xcd = xd - xc
      const ycd = yd - yc
      const r = ((yt - ya) * xcd - (xt - xa) * ycd) / (yab * xcd - xab * ycd)
      const s = ((yt - yc) * xab - (xt - xc) * yab) / (ycd * xab - xcd * yab)
      xp = xa + r * xab
      yq = yc + s * ycd
    }
    const xV = this.#isLog.x
      ? Math.pow(
          10,
          ((xp - xa) / (xb - xa)) * (Math.log10(b) - Math.log10(a)) +
            Math.log10(a),
        )
      : ((xp - xa) / (xb - xa)) * (b - a) + a
    const yV = this.#isLog.y
      ? Math.pow(
          10,
          ((yq - yc) / (yd - yc)) * (Math.log10(d) - Math.log10(c)) +
            Math.log10(c),
        )
      : ((yq - yc) / (yd - yc)) * (d - c) + c
    const xEffectiveDigits = this.calculateEffectiveDigits(
      this.#XYAxisSet.x2.value,
      this.#XYAxisSet.x1.value,
    )
    const yEffectiveDigits = this.calculateEffectiveDigits(
      this.#XYAxisSet.y2.value,
      this.#XYAxisSet.y1.value,
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

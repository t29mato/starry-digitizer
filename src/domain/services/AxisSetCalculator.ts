//INFO: implementing this class because this calculation logics hand XY values over to the dataset domain, using the states of AxisSet domain (handling multiple domain models)
import { AxisSetInterface } from '../models/AxisSet/AxisSetInterface'

export default class AxisSetCalculator {
  // INFO: 画像のサイズが1,000pxで1px未満の細かい調整はできず分解能4桁と考えたため
  effectiveDigits: number = 4

  #axisSet: AxisSetInterface
  #isLog: { x: boolean; y: boolean }
  constructor(axisSet: AxisSetInterface, isLog: { x: boolean; y: boolean }) {
    this.#axisSet = axisSet
    this.#isLog = isLog
  }
  calculateXYValues(xt: number, yt: number): { xV: string; yV: string } {
    if (
      !(
        this.#axisSet.x1.coord &&
        this.#axisSet.x2.coord &&
        this.#axisSet.y1.coord &&
        this.#axisSet.y2.coord
      )
    ) {
      return { xV: 'NaN', yV: 'NaN' }
    }
    if (
      this.#axisSet.x1.value === this.#axisSet.x2.value ||
      this.#axisSet.y1.value === this.#axisSet.y2.value
    ) {
      return { xV: 'NaN', yV: 'NaN' }
    }

    const [xa, ya, xb, yb, a, b, xc, yc, xd, yd, c, d] = [
      this.#axisSet.x1.coord.xPx,
      this.#axisSet.x1.coord.yPx,
      this.#axisSet.x2.coord.xPx,
      this.#axisSet.x2.coord.yPx,
      this.#axisSet.x1.value,
      this.#axisSet.x2.value,
      this.#axisSet.y1.coord.xPx,
      this.#axisSet.y1.coord.yPx,
      this.#axisSet.y2.coord.xPx,
      this.#axisSet.y2.coord.yPx,
      this.#axisSet.y1.value,
      this.#axisSet.y2.value,
    ]
    let xp = xt
    let yq = yt
    if (this.#axisSet.considerGraphTilt) {
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
      this.#axisSet.x2.value,
      this.#axisSet.x1.value,
    )
    const yEffectiveDigits = this.calculateEffectiveDigits(
      this.#axisSet.y2.value,
      this.#axisSet.y1.value,
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

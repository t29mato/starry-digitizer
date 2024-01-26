//INFO: implementing this class because this calculation logics hand XY values over to the dataset domain, using the states of axes domain (handling multiple domain models)
import { AxesInterface } from '../repositories/axes/axesInterface'

export default class XYAxesCalculator {
  // INFO: 画像のサイズが1,000pxで1px未満の細かい調整はできず分解能4桁と考えたため
  effectiveDigits: number = 4

  #axes: AxesInterface
  #isLog: { x: boolean; y: boolean }
  constructor(axes: AxesInterface, isLog: { x: boolean; y: boolean }) {
    this.#axes = axes
    this.#isLog = isLog
  }
  calculateXYValues(xt: number, yt: number): { xV: string; yV: string } {
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

    const [xa, ya, xb, yb, a, b, xc, yc, xd, yd, c, d] = [
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
    let xp = xt
    let yq = yt
    if (this.#axes.considerGraphTilt) {
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
      this.#axes.x2.value,
      this.#axes.x1.value,
    )
    const yEffectiveDigits = this.calculateEffectiveDigits(
      this.#axes.y2.value,
      this.#axes.y1.value,
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

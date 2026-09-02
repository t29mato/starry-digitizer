//INFO: implementing this class because this calculation logics hand XY values over to the dataset domain, using the states of AxisSet domain (handling multiple domain models)
import { AxisSetInterface } from '../models/axisSet/axisSetInterface'

export default class AxisSetCalculator {
  // INFO: 画像のサイズが1,000pxで1px未満の細かい調整はできず分解能4桁と考えたため
  effectiveDigits: number = 4

  #axisSet: AxisSetInterface
  #isLogScale: { x: boolean; y: boolean }
  constructor(
    axisSet: AxisSetInterface,
    isLogScale: { x: boolean; y: boolean },
    effectiveDigits?: number,
  ) {
    this.#axisSet = axisSet
    this.#isLogScale = isLogScale
    if (effectiveDigits !== undefined) {
      this.effectiveDigits = effectiveDigits
    }
  }
  // INFO: 軸が未配置の場合、coordはinitialCoord {-999, -999} (truthy) のため、
  // 存在チェックに加えて座標が非負(=実際に配置済み)であることを判定する
  get #allAxisCoordsAreFilled(): boolean {
    return [
      this.#axisSet.x1,
      this.#axisSet.x2,
      this.#axisSet.y1,
      this.#axisSet.y2,
    ].every((axis) => axis.coord && axis.coord.xPx >= 0 && axis.coord.yPx >= 0)
  }

  // INFO: xV/yV are returned as rounded numbers rather than display strings.
  // Turning a value into a display string (plain decimal vs exponential,
  // trailing-zero padding, ...) is a presentation concern, not a domain one
  // - see src/presentation/utils/formatCoordValue.ts for that step.
  calculateXYValues(
    xt: number,
    yt: number,
  ): { xV: number; yV: number } | { xV: null; yV: null } {
    if (!this.#allAxisCoordsAreFilled) {
      return { xV: null, yV: null }
    }
    if (
      this.#axisSet.x1.value === this.#axisSet.x2.value ||
      this.#axisSet.y1.value === this.#axisSet.y2.value
    ) {
      return { xV: null, yV: null }
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
    const xV = this.#isLogScale.x
      ? Math.pow(
          10,
          ((xp - xa) / (xb - xa)) * (Math.log10(b) - Math.log10(a)) +
            Math.log10(a),
        )
      : ((xp - xa) / (xb - xa)) * (b - a) + a
    const yV = this.#isLogScale.y
      ? Math.pow(
          10,
          ((yq - yc) / (yd - yc)) * (Math.log10(d) - Math.log10(c)) +
            Math.log10(c),
        )
      : ((yq - yc) / (yd - yc)) * (d - c) + c
    const xPrecised = parseFloat(xV.toPrecision(this.xEffectiveDigits))
    const yPrecised = parseFloat(yV.toPrecision(this.yEffectiveDigits))
    return {
      xV: xPrecised,
      yV: yPrecised,
    }
  }

  // INFO: how many significant digits are meaningful for this axis depends
  // on the magnitude of its value range, not just the user's "effective
  // digits" setting, hence the extra digits computed from numDigit() below.
  get xEffectiveDigits(): number {
    return this.calculateEffectiveDigits(
      this.#axisSet.x2.value,
      this.#axisSet.x1.value,
    )
  }

  get yEffectiveDigits(): number {
    return this.calculateEffectiveDigits(
      this.#axisSet.y2.value,
      this.#axisSet.y1.value,
    )
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

  calculatePixelCoordinates(
    xValue: number,
    yValue: number,
  ): { xPx: number; yPx: number } | null {
    if (!this.#allAxisCoordsAreFilled) {
      return null
    }
    if (
      this.#axisSet.x1.value === this.#axisSet.x2.value ||
      this.#axisSet.y1.value === this.#axisSet.y2.value
    ) {
      return null
    }

    const [xa, ya, xb, yb, a, b, xc, yc, yd, c, d] = [
      this.#axisSet.x1.coord.xPx,
      this.#axisSet.x1.coord.yPx,
      this.#axisSet.x2.coord.xPx,
      this.#axisSet.x2.coord.yPx,
      this.#axisSet.x1.value,
      this.#axisSet.x2.value,
      this.#axisSet.y1.coord.xPx,
      this.#axisSet.y1.coord.yPx,
      this.#axisSet.y2.coord.yPx,
      this.#axisSet.y1.value,
      this.#axisSet.y2.value,
    ]

    const xRatio = this.#isLogScale.x
      ? (Math.log10(xValue) - Math.log10(a)) / (Math.log10(b) - Math.log10(a))
      : (xValue - a) / (b - a)

    const yRatio = this.#isLogScale.y
      ? (Math.log10(yValue) - Math.log10(c)) / (Math.log10(d) - Math.log10(c))
      : (yValue - c) / (d - c)

    let xPx = xa + xRatio * (xb - xa)
    let yPx = yc + yRatio * (yd - yc)

    if (this.#axisSet.considerGraphTilt) {
      const xab = xb - xa
      const yab = yb - ya
      const r = xRatio
      const s = yRatio
      xPx = xa + r * xab + s * (xc - xa)
      yPx = ya + r * yab + s * (yc - ya)
    }

    return { xPx, yPx }
  }
}

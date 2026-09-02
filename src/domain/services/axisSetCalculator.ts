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

  calculateXYValues(xt: number, yt: number): { xV: string; yV: string } {
    if (!this.#allAxisCoordsAreFilled) {
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

// INFO: The pixel-space rectangle spanned by the calibrated x1/x2/y1/y2 axes.
// Used to clip extraction results (e.g. legend glyphs, axis labels) to the
// plotted data area. See https://github.com/t29mato/starry-digitizer/issues/278
export type PixelBoundingBox = {
  xPxMin: number
  xPxMax: number
  yPxMin: number
  yPxMax: number
}

/**
 * Returns the pixel-space bounding box formed by the x1/x2/y1/y2 axis
 * coordinates, or null when the axis set is not fully calibrated yet
 * (i.e. at least one of the four axes has no pixel coordinate assigned).
 *
 * Handles either axis direction: x1 is not guaranteed to be left of x2,
 * nor y1 above y2, so the box bounds are derived via min/max rather than
 * assuming a fixed ordering.
 */
export function getAxisSetPixelBoundingBox(
  axisSet: AxisSetInterface,
): PixelBoundingBox | null {
  const axes = [axisSet.x1, axisSet.x2, axisSet.y1, axisSet.y2]
  const isFullyCalibrated = axes.every(
    (axis) => axis.coord && axis.coord.xPx >= 0 && axis.coord.yPx >= 0,
  )
  if (!isFullyCalibrated) {
    return null
  }

  const xPxValues = [axisSet.x1.coord.xPx, axisSet.x2.coord.xPx]
  const yPxValues = [axisSet.y1.coord.yPx, axisSet.y2.coord.yPx]

  return {
    xPxMin: Math.min(...xPxValues),
    xPxMax: Math.max(...xPxValues),
    yPxMin: Math.min(...yPxValues),
    yPxMax: Math.max(...yPxValues),
  }
}

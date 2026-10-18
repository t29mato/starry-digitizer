import { AxisSetInterface } from '@/domain/models/axisSet/axisSetInterface'

/**
 * The axis set's calibrated space: the plane in which the axes are linear.
 *
 * `u` is the x value on a linear X axis and `log10(x)` on a log X axis; `v`
 * the same for y. Pixels ↔ (u, v) is an affine map, so anything that is a
 * straight line in the figure is a straight line here, and a power law drawn
 * on log-log axes is a straight line too. Resampling works in this space, not
 * in raw values (where a log axis would bend every interpolation) and not in
 * pixels (where "evenly spaced x" would mean nothing on a log axis).
 *
 * INFO: the pixel → (r, s) part repeats `AxisSetCalculator.calculateXYValues()`
 * (both the plain and the tilt-corrected branch) WITHOUT its rounding to the
 * display digits, and the inverse is the exact inverse of that affine map —
 * not `calculatePixelCoordinates()`, whose tilt branch is not the inverse of
 * the forward map. A point taken to (u, v) and back lands on the same pixel.
 */
export interface CalibratedSpace {
  logX: boolean
  logY: boolean
  toCalibrated(xPx: number, yPx: number): { u: number; v: number }
  toPixel(u: number, v: number): { xPx: number; yPx: number }
  /** calibrated x (u) → the value shown to the user */
  uToValue(u: number): number
  vToValue(v: number): number
  /** a value typed by the user → calibrated x; NaN when not representable */
  valueToU(x: number): number
  valueToV(y: number): number
  /**
   * Screen pixels per calibrated unit along each axis. Distances measured as
   * hypot(du·pxPerU, dv·pxPerV) are what the user sees on the figure, so a
   * tolerance given "in pixels" means the same thing on linear and log axes.
   */
  pxPerU: number
  pxPerV: number
}

function isPlaced(axisSet: AxisSetInterface): boolean {
  return [axisSet.x1, axisSet.x2, axisSet.y1, axisSet.y2].every(
    (axis) =>
      axis.coord &&
      Number.isFinite(axis.coord.xPx) &&
      Number.isFinite(axis.coord.yPx) &&
      axis.coord.xPx >= 0 &&
      axis.coord.yPx >= 0,
  )
}

/**
 * @returns null when the axis set cannot calibrate: an axis not placed yet,
 * equal values on one axis, a non-positive value on a log axis, or a
 * degenerate (collinear) placement.
 */
export function calibratedSpaceOf(
  axisSet: AxisSetInterface | undefined,
): CalibratedSpace | null {
  if (!axisSet || !isPlaced(axisSet)) return null
  const logX = axisSet.xIsLogScale
  const logY = axisSet.yIsLogScale
  const [a, b, c, d] = [
    axisSet.x1.value,
    axisSet.x2.value,
    axisSet.y1.value,
    axisSet.y2.value,
  ]
  if (![a, b, c, d].every(Number.isFinite)) return null
  if (a === b || c === d) return null
  if (logX && (a <= 0 || b <= 0)) return null
  if (logY && (c <= 0 || d <= 0)) return null

  const lx1 = logX ? Math.log10(a) : a
  const lx2 = logX ? Math.log10(b) : b
  const ly1 = logY ? Math.log10(c) : c
  const ly2 = logY ? Math.log10(d) : d

  const { xPx: xa, yPx: ya } = axisSet.x1.coord
  const { xPx: xb, yPx: yb } = axisSet.x2.coord
  const { xPx: xc, yPx: yc } = axisSet.y1.coord
  const { xPx: xd, yPx: yd } = axisSet.y2.coord
  const tilt = axisSet.considerGraphTilt

  // INFO: (r, s) = the position as a fraction of x1→x2 and y1→y2, exactly as
  // AxisSetCalculator.calculateXYValues() computes it.
  const ratio = (xt: number, yt: number): [number, number] => {
    if (!tilt) {
      return [(xt - xa) / (xb - xa), (yt - yc) / (yd - yc)]
    }
    const xab = xb - xa
    const yab = yb - ya
    const xcd = xd - xc
    const ycd = yd - yc
    const r = ((yt - ya) * xcd - (xt - xa) * ycd) / (yab * xcd - xab * ycd)
    const s = ((yt - yc) * xab - (xt - xc) * yab) / (ycd * xab - xcd * yab)
    return [r, s]
  }

  // INFO: the map is affine, so three evaluations give it exactly.
  const [r0, s0] = ratio(0, 0)
  const [rx, sx] = ratio(1, 0)
  const [ry, sy] = ratio(0, 1)
  const m11 = rx - r0
  const m12 = ry - r0
  const m21 = sx - s0
  const m22 = sy - s0
  const det = m11 * m22 - m12 * m21
  if (![r0, s0, m11, m12, m21, m22].every(Number.isFinite)) return null
  if (!Number.isFinite(det) || Math.abs(det) < 1e-15) return null

  const toCalibrated = (xPx: number, yPx: number) => {
    const r = r0 + m11 * xPx + m12 * yPx
    const s = s0 + m21 * xPx + m22 * yPx
    return { u: lx1 + r * (lx2 - lx1), v: ly1 + s * (ly2 - ly1) }
  }
  const toPixel = (u: number, v: number) => {
    const dr = (u - lx1) / (lx2 - lx1) - r0
    const ds = (v - ly1) / (ly2 - ly1) - s0
    return {
      xPx: (m22 * dr - m12 * ds) / det,
      yPx: (-m21 * dr + m11 * ds) / det,
    }
  }
  // INFO: |∂P/∂r| and |∂P/∂s| from the inverse matrix columns.
  const pxPerR = Math.hypot(m22 / det, -m21 / det)
  const pxPerS = Math.hypot(-m12 / det, m11 / det)

  return {
    logX,
    logY,
    toCalibrated,
    toPixel,
    uToValue: (u) => (logX ? Math.pow(10, u) : u),
    vToValue: (v) => (logY ? Math.pow(10, v) : v),
    valueToU: (x) => (logX ? (x > 0 ? Math.log10(x) : NaN) : x),
    valueToV: (y) => (logY ? (y > 0 ? Math.log10(y) : NaN) : y),
    pxPerU: pxPerR / Math.abs(lx2 - lx1),
    pxPerV: pxPerS / Math.abs(ly2 - ly1),
  }
}

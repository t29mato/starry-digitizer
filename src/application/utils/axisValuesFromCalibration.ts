import { AutoCalibrationProposal } from '@/application/services/autoService/autoServiceWire'
import { fitAxisTicks } from '@/domain/services/axisTickFitter'
import { AXIS_NAMES, AxisName, Coord } from './axisOcrMatcher'

// INFO: "Auto-fill values" with the auto service: the person has placed the
// axis points (x1/x2/y1/y2) where they want them; the service's calibration
// (the same /calibrate answer Axis Auto-place uses) gives the value at each
// of those points. The value of the fitted line there is snapped to the
// grid of the ticks the service read (450, 500, … → a point placed on the
// 650 tick gets exactly 650, not 649.7), when it is that close to it.
//
// Measured on real-chart-bench verified_pairs (91 figures with images,
// 2026-11-23; points placed on the person's ticks; tol 0.5 % of the tick
// span, docs/design/starryai-auto.md §2.4): both axes right in 79 figures,
// against 23 with the browser OCR alone (Auto-fill values (OCR)).

/** within this share of a tick step, the value is the grid value */
const SNAP_SHARE = 0.25

function axisOf(name: AxisName): 'x' | 'y' {
  return name.startsWith('x') ? 'x' : 'y'
}

/** "0.30000000000000004" and its like → 0.3 */
function tidy(value: number): number {
  return Number(value.toPrecision(12))
}

/**
 * The value at each placed axis point, for the axes the service calibrated
 * (`ok`). Axes it did not, and points not placed, are absent: the caller
 * fills them some other way (the browser OCR) or leaves them to the person.
 */
export function axisValuesAtPoints(
  proposal: AutoCalibrationProposal,
  coords: Partial<Record<AxisName, Coord>>,
): Partial<Record<AxisName, number>> {
  const result: Partial<Record<AxisName, number>> = {}
  for (const name of AXIS_NAMES) {
    const coord = coords[name]
    const axis = proposal[axisOf(name)]
    if (!coord || !axis.ok || !axis.scale) continue
    let fit
    try {
      fit = fitAxisTicks(axis.ticks, axis.scale)
    } catch {
      continue
    }
    const toT = (v: number) => (axis.scale === 'log' ? Math.log10(v) : v)
    const px = axisOf(name) === 'x' ? coord.xPx : coord.yPx
    let t = (px - fit.intercept) / fit.slope
    const grid = Array.from(
      new Set(axis.ticks.map((tick) => toT(tick.value))),
    ).sort((a, b) => a - b)
    const steps = grid
      .slice(1)
      .map((value, i) => value - grid[i])
      .filter((step) => step > 0)
      .sort((a, b) => a - b)
    if (steps.length > 0) {
      const step = steps[Math.floor(steps.length / 2)]
      const snapped = grid[0] + Math.round((t - grid[0]) / step) * step
      if (Math.abs(snapped - t) <= SNAP_SHARE * step) t = snapped
    }
    const value = axis.scale === 'log' ? 10 ** t : t
    if (Number.isFinite(value)) result[name] = tidy(value)
  }
  return result
}

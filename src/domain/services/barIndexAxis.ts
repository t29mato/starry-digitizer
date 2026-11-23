import { AxisTick, fitAxisTicks } from './axisTickFitter'

// INFO: The x axis of a bar plot, as this digitizer represents it: an
// ordinary linear X axis whose value is the BAR INDEX, 0 for the leftmost
// bar, 1 for the next, … (wpd-auto labels the same bars Bar0, Bar1, …).
// docs/design/starryai-auto.md §10 Q7: no axis kind of its own, so every
// calculation, export and project file works unchanged.
//
// The bars are numbered left to right and the index is fitted to their
// centres by least squares (the same fit as a tick calibration), so one bar
// found a little off-centre does not shift all the others. Evenly spaced
// bars come out as whole numbers; unevenly spaced ones (grouped bars) do not.

/** The bars' centres → ticks (px, index), left to right. */
export function barIndexTicks(barCentresPx: number[]): AxisTick[] {
  return barCentresPx
    .filter((px) => Number.isFinite(px))
    .sort((a, b) => a - b)
    .map((px, index) => ({ px, value: index }))
}

/**
 * The two reference points of the bar-index X axis (x1 and x2), or null
 * when there is no bar.
 *
 * One bar (or bars at one position) has no spacing to fit: x1 is that bar
 * at 0 and x2 is `singleBarSpanPx` to its right at 1, so the bar reads 0
 * exactly and the person can move x2 onto a second bar.
 */
export function barIndexReferences(
  barCentresPx: number[],
  singleBarSpanPx = 100,
): { low: AxisTick; high: AxisTick } | null {
  const ticks = barIndexTicks(barCentresPx)
  if (ticks.length === 0) return null
  const distinct = new Set(ticks.map((tick) => tick.px)).size
  if (distinct < 2) {
    const px = ticks[0].px
    const span = singleBarSpanPx > 0 ? singleBarSpanPx : 100
    return { low: { px, value: 0 }, high: { px: px + span, value: 1 } }
  }
  return fitAxisTicks(ticks, 'linear').reference
}

import { AxisSetInterface } from '@/domain/models/axisSet/axisSetInterface'

// The unit an interpolation "interval" value is expressed in.
// - 'px': raw pixel distance along the anchor-point curve (legacy behavior).
// - 'dataUnit': distance expressed in x-axis data units (e.g. Kelvin),
//   converted to an equivalent pixel distance before being fed into the
//   existing interpolation math.
export type IntervalUnit = 'px' | 'dataUnit'

/**
 * Whether the x-axis of the given axis set is calibrated well enough to
 * convert a distance expressed in x-axis data units into an equivalent
 * pixel distance (i.e. a single, fixed px-per-data-unit ratio exists).
 *
 * Requires:
 * - both the x1 and x2 axis points to be placed on the image
 * - x1.value !== x2.value, so a non-degenerate scale can be derived
 * - x1 and x2 not sharing the same pixel x-coordinate (would divide by
 *   zero / produce an infinite ratio)
 * - the x-axis not being log-scaled, since a log scale has no single
 *   px-per-unit ratio (it varies along the axis)
 */
export const isXAxisCalibratedForDataUnitInterval = (
  axisSet: AxisSetInterface,
): boolean => {
  if (axisSet.xIsLogScale) {
    return false
  }

  const x1CoordIsPlaced = axisSet.x1.coord.xPx >= 0 && axisSet.x1.coord.yPx >= 0
  const x2CoordIsPlaced = axisSet.x2.coord.xPx >= 0 && axisSet.x2.coord.yPx >= 0

  if (!x1CoordIsPlaced || !x2CoordIsPlaced) {
    return false
  }

  if (axisSet.x1.value === axisSet.x2.value) {
    return false
  }

  return axisSet.x1.coord.xPx !== axisSet.x2.coord.xPx
}

/**
 * Converts an interval expressed in x-axis data units into the equivalent
 * pixel-space interval, using the calibrated x-axis scale (px per data
 * unit, derived from the x1/x2 axis points). Returns null when the x-axis
 * is not calibrated for this conversion (see
 * isXAxisCalibratedForDataUnitInterval) -- callers should fall back to
 * treating the interval value as px in that case.
 */
export const convertDataUnitIntervalToPx = (
  axisSet: AxisSetInterface,
  dataUnitInterval: number,
): number | null => {
  if (!isXAxisCalibratedForDataUnitInterval(axisSet)) {
    return null
  }

  const pxDistance = Math.abs(axisSet.x2.coord.xPx - axisSet.x1.coord.xPx)
  const valueDistance = Math.abs(axisSet.x2.value - axisSet.x1.value)

  const pxPerDataUnit = pxDistance / valueDistance

  return dataUnitInterval * pxPerDataUnit
}

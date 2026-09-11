import { Coord } from '@/@types/types'

/** Just enough of a point to place it; the scaled overlay coordinates. */
export interface PickablePoint {
  id: number
  xPx: number
  yPx: number
}

/**
 * Which point a click at `coord` means, when several markers' hit areas cover
 * it: THE NEAREST ONE.
 *
 * INFO: this exists because "the marker drawn on top takes the click" is wrong
 * often enough to be felt. Hit areas are square and never smaller than
 * STYLE.POINT_HIT_MIN_SIZE_PX, so wherever points sit closer together than
 * that, several of them cover the same pixel and the last one in DOM order
 * won — regardless of which one the user was actually pointing at. Measured on
 * real figures by a host: at fit/100%/200%, in the band where points are 6-12px
 * apart, the wrong point was picked in about a third of clicks, and in half of
 * those the winner was not even the closest — one case picked a point 8.06px
 * away from a click that landed exactly on another point's centre.
 *
 * Distance decides, and ties go to the LAST candidate: that is the one drawn
 * on top, so a tie resolves to what the user can see.
 *
 * `hitSizePx` is the full width of the (square) hit area every marker has at
 * the current zoom — the same value the markers are rendered with, so the
 * candidates here are exactly the markers covering the click.
 *
 * @returns the id, or undefined when the click is outside every marker.
 */
export function nearestPointId(
  points: readonly PickablePoint[],
  coord: Coord,
  hitSizePx: number,
): number | undefined {
  const halfPx = hitSizePx / 2

  let nearestId: number | undefined
  let nearestDistanceSq = Infinity

  points.forEach((point) => {
    const dx = coord.xPx - point.xPx
    const dy = coord.yPx - point.yPx
    // INFO: the hit area is a square, so containment is per-axis. Filtering by
    // a circle here would ignore the corners of a marker the user really did
    // click on.
    if (Math.abs(dx) > halfPx || Math.abs(dy) > halfPx) return

    const distanceSq = dx * dx + dy * dy
    // INFO: `<=` rather than `<` is the tie-break — later candidates are drawn
    // on top, so an exact tie resolves to the visible one.
    if (distanceSq <= nearestDistanceSq) {
      nearestDistanceSq = distanceSq
      nearestId = point.id
    }
  })

  return nearestId
}

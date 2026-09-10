// INFO: which point a click means when markers overlap. Hit areas never
// shrink below STYLE.POINT_HIT_MIN_SIZE_PX, so anywhere points sit closer
// together than that, several markers cover the same pixel. The browser hands
// the click to whichever element is on top, which is not what the user aimed
// at — measured on real figures at fit/100%/200%: about a third of clicks in
// the 6-12px band went to the wrong point, and in half of those the winner was
// not even the closest (one click landed exactly on a point's centre and was
// taken by a point 8.06px away).
import { nearestPointId } from '@/application/utils/pointPicking'

const HIT = 12

describe('nearestPointId', () => {
  it('picks the point the click landed on', () => {
    const points = [
      { id: 1, xPx: 100, yPx: 100 },
      { id: 2, xPx: 108, yPx: 100 },
    ]

    expect(nearestPointId(points, { xPx: 100, yPx: 100 }, HIT)).toBe(1)
    expect(nearestPointId(points, { xPx: 108, yPx: 100 }, HIT)).toBe(2)
  })

  // INFO: the reported failure, as a test. Both markers cover the click, and
  // the one drawn later used to win however far away it was.
  it('does not let a point drawn on top steal a click nearer to another', () => {
    const points = [
      { id: 1, xPx: 100, yPx: 100 },
      // 8px away and LAST in the array — i.e. on top.
      { id: 2, xPx: 108, yPx: 100 },
    ]

    expect(nearestPointId(points, { xPx: 100, yPx: 100 }, HIT)).toBe(1)
  })

  it('picks the nearest of several overlapping markers', () => {
    const points = [
      { id: 1, xPx: 100, yPx: 100 },
      { id: 2, xPx: 104, yPx: 100 },
      { id: 3, xPx: 109, yPx: 100 },
    ]

    expect(nearestPointId(points, { xPx: 105, yPx: 100 }, HIT)).toBe(2)
  })

  it('measures in two dimensions, not per axis', () => {
    const points = [
      { id: 1, xPx: 100, yPx: 105 },
      { id: 2, xPx: 104, yPx: 101 },
    ]

    // INFO: (100,100) is 5px from #1 and ~4.12px from #2.
    expect(nearestPointId(points, { xPx: 100, yPx: 100 }, HIT)).toBe(2)
  })

  // INFO: the hit area is a square, so a click in a marker's CORNER is inside
  // it. Filtering candidates by a circle would drop points the user did click.
  it('counts a marker whose corner covers the click', () => {
    const points = [{ id: 1, xPx: 100, yPx: 100 }]

    expect(nearestPointId(points, { xPx: 105.5, yPx: 105.5 }, HIT)).toBe(1)
  })

  it('ignores markers that do not cover the click', () => {
    const points = [
      { id: 1, xPx: 100, yPx: 100 },
      { id: 2, xPx: 130, yPx: 100 },
    ]

    expect(nearestPointId(points, { xPx: 118, yPx: 100 }, HIT)).toBeUndefined()
  })

  it('has no answer when there are no points', () => {
    expect(nearestPointId([], { xPx: 0, yPx: 0 }, HIT)).toBeUndefined()
  })

  // INFO: a tie resolves to the last one, which is the one drawn on top —
  // so the click goes to the marker the user can actually see.
  it('gives an exact tie to the marker on top', () => {
    const points = [
      { id: 1, xPx: 96, yPx: 100 },
      { id: 2, xPx: 104, yPx: 100 },
    ]

    expect(nearestPointId(points, { xPx: 100, yPx: 100 }, HIT)).toBe(2)
  })

  it('follows the hit size it is given', () => {
    const points = [{ id: 1, xPx: 100, yPx: 100 }]

    // INFO: 7px away — inside a 20px marker, outside a 12px one.
    expect(nearestPointId(points, { xPx: 107, yPx: 100 }, 20)).toBe(1)
    expect(nearestPointId(points, { xPx: 107, yPx: 100 }, HIT)).toBeUndefined()
  })
})

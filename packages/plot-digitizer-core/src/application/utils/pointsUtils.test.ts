import { getPointsTotalDistance } from './pointsUtils'

describe('getPointsTotalDistance', () => {
  test('returns 0 for an empty list', () => {
    expect(getPointsTotalDistance([])).toBe(0)
  })

  test('returns 0 for a single point', () => {
    expect(getPointsTotalDistance([{ id: 1, xPx: 5, yPx: 5 }])).toBe(0)
  })

  test('sums the Euclidean distance between consecutive points', () => {
    const points = [
      { id: 1, xPx: 0, yPx: 0 },
      { id: 2, xPx: 3, yPx: 4 }, // distance 5 from point 1
      { id: 3, xPx: 3, yPx: 10 }, // distance 6 from point 2
    ]
    expect(getPointsTotalDistance(points)).toBe(11)
  })
})

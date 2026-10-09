import { isPointInPolygon } from './polygon'

const square = [
  { xPx: 0, yPx: 0 },
  { xPx: 10, yPx: 0 },
  { xPx: 10, yPx: 10 },
  { xPx: 0, yPx: 10 },
]

describe('isPointInPolygon', () => {
  test('inside / outside a square', () => {
    expect(isPointInPolygon({ xPx: 5, yPx: 5 }, square)).toBe(true)
    expect(isPointInPolygon({ xPx: 15, yPx: 5 }, square)).toBe(false)
    expect(isPointInPolygon({ xPx: 5, yPx: -1 }, square)).toBe(false)
  })

  test('concave polygon (U shape): the notch is outside', () => {
    const u = [
      { xPx: 0, yPx: 0 },
      { xPx: 3, yPx: 0 },
      { xPx: 3, yPx: 7 },
      { xPx: 7, yPx: 7 },
      { xPx: 7, yPx: 0 },
      { xPx: 10, yPx: 0 },
      { xPx: 10, yPx: 10 },
      { xPx: 0, yPx: 10 },
    ]
    expect(isPointInPolygon({ xPx: 5, yPx: 3 }, u)).toBe(false)
    expect(isPointInPolygon({ xPx: 5, yPx: 9 }, u)).toBe(true)
    expect(isPointInPolygon({ xPx: 1, yPx: 3 }, u)).toBe(true)
  })

  test('degenerate polygons contain nothing', () => {
    expect(isPointInPolygon({ xPx: 0, yPx: 0 }, square.slice(0, 2))).toBe(
      false,
    )
  })
})

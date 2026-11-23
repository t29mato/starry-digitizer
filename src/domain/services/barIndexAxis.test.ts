import { barIndexReferences, barIndexTicks } from './barIndexAxis'

describe('bar index axis', () => {
  test('numbers the bars from the left', () => {
    expect(barIndexTicks([300, 100, 200])).toEqual([
      { px: 100, value: 0 },
      { px: 200, value: 1 },
      { px: 300, value: 2 },
    ])
  })

  test('evenly spaced bars: the references are the first and last bar', () => {
    const ref = barIndexReferences([133, 239, 345, 451, 557])
    expect(ref?.low.value).toBe(0)
    expect(ref?.high.value).toBe(4)
    expect(ref?.low.px).toBeCloseTo(133)
    expect(ref?.high.px).toBeCloseTo(557)
  })

  test('one bar found off-centre is averaged out, not taken as a reference', () => {
    const ref = barIndexReferences([100, 200, 300, 410])
    // INFO: least squares through (px, index): neither end is exactly a bar
    expect(ref?.low.px).not.toBe(100)
    expect(ref?.high.px).not.toBe(410)
    expect(ref?.high.value).toBe(3)
  })

  test('one bar: 0 at the bar, 1 a span to its right', () => {
    expect(barIndexReferences([250], 40)).toEqual({
      low: { px: 250, value: 0 },
      high: { px: 290, value: 1 },
    })
    expect(barIndexReferences([250, 250])?.high.px).toBe(350)
  })

  test('no bar: null', () => {
    expect(barIndexReferences([])).toBeNull()
    expect(barIndexReferences([NaN])).toBeNull()
  })
})

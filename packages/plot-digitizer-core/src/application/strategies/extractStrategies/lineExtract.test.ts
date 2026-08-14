import LineExtract from './lineExtract'

const extractor = LineExtract.instance
extractor.dxPx = 1
extractor.dyPx = 3

// r: red, w: white
test(`automatic extraction
wwwwww
rrrrrr
wwwwww
`, () => {
  const coords = extractor.execute(
    6,
    6,
    new Uint8ClampedArray([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0,
      255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0,
    ]),
    new Uint8ClampedArray([]),
    false,
    [255, 0, 0],
    10,
  )
  expect(coords).toEqual([
    {
      xPx: 1,
      yPx: 1.5,
    },
    {
      xPx: 3,
      yPx: 1.5,
    },
    {
      xPx: 5,
      yPx: 1.5,
    },
  ])
})

describe('isOnMask (inherited from ExtractParent)', () => {
  test('is true only for fully-opaque yellow (#ffff00)', () => {
    expect(extractor.isOnMask(255, 255, 0, 1)).toBe(true)
  })

  test('is false when red is not 255', () => {
    expect(extractor.isOnMask(0, 255, 0, 1)).toBe(false)
  })

  test('is false when green is not 255', () => {
    expect(extractor.isOnMask(255, 0, 0, 1)).toBe(false)
  })

  test('is false when blue is not 0', () => {
    expect(extractor.isOnMask(255, 255, 1, 1)).toBe(false)
  })

  test('is false when alpha is not greater than 0', () => {
    expect(extractor.isOnMask(255, 255, 0, 0)).toBe(false)
  })
})

test('isDrawnMask excludes pixels whose mask pixel is not "on mask", breaking their region apart', () => {
  // 1x3 red image; only column 0 and 2 are within the (yellow) mask, so the
  // masked-out middle pixel splits what would otherwise be one contiguous
  // matched region into two single-pixel regions.
  const coords = extractor.execute(
    1,
    3,
    new Uint8ClampedArray([255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0]),
    new Uint8ClampedArray([
      255, 255, 0, 255, 0, 0, 0, 0, 255, 255, 0, 255,
    ]),
    true,
    [255, 0, 0],
    10,
  )
  expect(coords).toEqual([
    { xPx: 0.5, yPx: 0.5 },
    { xPx: 2.5, yPx: 0.5 },
  ])
})

test('a matched region stops growing once it drifts further than dyPx from its origin', () => {
  // 8x1 red image (single column). dyPx is 3 (set at the top of this file),
  // so growth from row 0 cannot reach row 4 in one region — it splits into
  // rows 0-3 and rows 4-7.
  const redPixel = [255, 0, 0, 0]
  const coords = extractor.execute(
    8,
    1,
    new Uint8ClampedArray(Array(8).fill(redPixel).flat()),
    new Uint8ClampedArray([]),
    false,
    [255, 0, 0],
    10,
  )
  expect(coords).toEqual([
    { xPx: 0.5, yPx: 2 },
    { xPx: 0.5, yPx: 6 },
  ])
})

test('setDxPx / setDyPx update the growth-distance thresholds', () => {
  const strategy = new LineExtract()
  strategy.setDxPx(7)
  strategy.setDyPx(8)
  expect(strategy.dxPx).toBe(7)
  expect(strategy.dyPx).toBe(8)
})

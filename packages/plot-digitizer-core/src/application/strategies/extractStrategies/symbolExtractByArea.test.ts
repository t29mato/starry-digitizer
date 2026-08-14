import SymbolExtractByArea from './symbolExtractByArea'

const extractor = SymbolExtractByArea.instance
extractor.minDiameterPx = 0
extractor.maxDiameterPx = 1000

test('matchColor', () => {
  expect(extractor.matchColor([255, 0, 0], [255, 1, 0], 10)).toBe(true)
  expect(extractor.matchColor([255, 0, 0], [255, 255, 0], 10)).toBe(false)
})

test('isDrawnMask excludes pixels whose mask pixel is not "on mask", breaking their region apart', () => {
  // 1x3 red image; only column 0 and 2 are within the (yellow) mask, so the
  // masked-out middle pixel splits what would otherwise be one contiguous
  // matched region into two single-pixel symbols.
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

test('a region is excluded when its diameter falls outside [minDiameterPx, maxDiameterPx]', () => {
  const strategy = new SymbolExtractByArea()
  strategy.minDiameterPx = 10 // a single 1px "symbol" has diameter ~1.13, well under 10
  strategy.maxDiameterPx = 100
  const coords = strategy.execute(
    3,
    3,
    new Uint8ClampedArray([
      255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0,
    ]),
    new Uint8ClampedArray([]),
    false,
    [255, 0, 0],
    10,
  )
  expect(coords).toEqual([])
})

test('setMinDiameterPx / setMaxDiameterPx update the diameter thresholds', () => {
  const strategy = new SymbolExtractByArea()
  strategy.setMinDiameterPx(3)
  strategy.setMaxDiameterPx(30)
  expect(strategy.minDiameterPx).toBe(3)
  expect(strategy.maxDiameterPx).toBe(30)
})

// r: red, w: white
test(`automatic extraction
rww
www
wwr
`, () => {
  const coords = extractor.execute(
    3,
    3,
    new Uint8ClampedArray([255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 0, 0, 0]),
    new Uint8ClampedArray([]),
    false,
    [255, 0, 0],
    10,
  )
  expect(coords).toEqual([
    {
      xPx: 0.5,
      yPx: 0.5,
    },
    {
      xPx: 2.5,
      yPx: 2.5,
    },
  ])
})

// r: red, w: white
test(`automatic extraction
rww
wrw
wwr
`, () => {
  const coords = extractor.execute(
    3,
    3,
    new Uint8ClampedArray([255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 0, 0, 0]),
    new Uint8ClampedArray([]),
    false,
    [255, 0, 0],
    10,
  )
  expect(coords).toEqual([
    {
      xPx: 1.5,
      yPx: 1.5,
    },
  ])
})

// r: red, w: white
test(`automatic extraction
rrr
rwr
rrr
`, () => {
  const coords = extractor.execute(
    3,
    3,
    new Uint8ClampedArray([255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 0, 0, 0]),
    new Uint8ClampedArray([]),
    false,
    [255, 0, 0],
    10,
  )
  expect(coords).toEqual([
    {
      xPx: 1.5,
      yPx: 1.5,
    },
  ])
})

// r: red, w: white
test(`automatic extraction
rrr
www
rrr
`, () => {
  const coords = extractor.execute(
    3,
    3,
    new Uint8ClampedArray([255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0]),
    new Uint8ClampedArray([]),
    false,
    [255, 0, 0],
    10,
  )
  expect(coords).toEqual([
    {
      xPx: 1.5,
      yPx: 0.5,
    },
    {
      xPx: 1.5,
      yPx: 2.5,
    },
  ])
})

// r: red, w: white
test(`automatic extraction
rrr
rrw
rww
`, () => {
  const coords = extractor.execute(
    3,
    3,
    new Uint8ClampedArray([255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    new Uint8ClampedArray([]),
    false,
    [255, 0, 0],
    10,
  )
  expect(coords).toEqual([
    {
      xPx: 1.2,
      yPx: 1.2,
    },
  ])
})

// r: red, w: white
test(`automatic extraction
rrrr
rrrr
wwww
rrrr
`, () => {
  const coords = extractor.execute(
    4,
    4,
    new Uint8ClampedArray([255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0]),
    new Uint8ClampedArray([]),
    false,
    [255, 0, 0],
    10,
  )
  expect(coords).toEqual([
    {
      xPx: 2,
      yPx: 1,
    },
    {
      xPx: 2,
      yPx: 3.5,
    },
  ])
})


/* eslint-disable prettier/prettier */
/* eslint-disable jest/valid-title */
import SymbolExtractByArea from './symbolExtractByArea'

const extractor = SymbolExtractByArea.instance
extractor.minDiameterPx = 0
extractor.maxDiameterPx = 1000

test('matchColor', () => {
  expect(extractor.matchColor([255, 0, 0], [255, 1, 0], 10)).toBe(true)
  expect(extractor.matchColor([255, 0, 0], [255, 255, 0], 10)).toBe(false)
})

// r: red, w: white
test(`automatic extraction
rww
www
wwr
`, () => {
  const coords = extractor.execute(3,3,[
    255,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    255,0,0,0,
  ], [], false, [255,0,0], 10)
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

test(`automatic extraction
rww
wrw
wwr
`, () => {
  const coords = extractor.execute(3,3,[
    255,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    255,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    255,0,0,0,
  ], [], false, [255,0,0], 10)
  expect(coords).toEqual([
    {
      xPx: 1.5,
      yPx: 1.5,
    },
  ])
})

test(`automatic extraction
rrr
rwr
rrr
`, () => {
  const coords = extractor.execute(3,3,[
    255,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    255,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    255,0,0,0,
  ], [], false, [255,0,0], 10)
  expect(coords).toEqual([
    {
      xPx: 1.5,
      yPx: 1.5,
    },
  ])
})

test(`automatic extraction
rrr
www
rrr
`, () => {
  const coords = extractor.execute(3,3,[
    255,0,0,0,
    255,0,0,0,
    255,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    255,0,0,0,
    255,0,0,0,
    255,0,0,0,
  ], [], false, [255,0,0], 10)
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

test(`automatic extraction
rrr
rrw
rww
`, () => {
  const coords = extractor.execute(3,3,[
    255,0,0,0,
    255,0,0,0,
    255,0,0,0,
    255,0,0,0,
    255,0,0,0,
    0,0,0,0,
    255,0,0,0,
    0,0,0,0,
    0,0,0,0,
  ], [], false, [255,0,0], 10)
  expect(coords).toEqual([
    {
      xPx: 1.2,
      yPx: 1.2,
    },
  ])
})

test(`automatic extraction
rrrr
rrrr
wwww
rrrr
`, () => {
  const coords = extractor.execute(4,4,[
    255,0,0,0,
    255,0,0,0,
    255,0,0,0,
    255,0,0,0,
    255,0,0,0,
    255,0,0,0,
    255,0,0,0,
    255,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    255,0,0,0,
    255,0,0,0,
    255,0,0,0,
    255,0,0,0,
  ], [], false, [255,0,0], 10)
  expect(coords).toEqual([
    {
      xPx: 2.0,
      yPx: 1,
    },
    {
      xPx: 2.0,
      yPx: 3.5,
    },
  ])
})

import SymbolExtractByArea from './SymbolExtractByArea'

const extractor = new SymbolExtractByArea()

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
  const plots = extractor.execute(3,3,[
    255,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    255,0,0,0,
  ], [255,0,0], 10, false, [])
  expect(plots).toEqual([
    {
      id: 0,
      xPx: 0,
      yPx: 0,
    },
    {
      id: 1,
      xPx: 2,
      yPx: 2,
    },
  ])
})

test(`automatic extraction
rww
wrw
wwr
`, () => {
  const plots = extractor.execute(3,3,[
    255,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    255,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    255,0,0,0,
  ], [255,0,0], 10, false, [])
  expect(plots).toEqual([
    {
      id: 0,
      xPx: 1,
      yPx: 1,
    },
  ])
})

test(`automatic extraction
rrr
rwr
rrr
`, () => {
  const plots = extractor.execute(3,3,[
    255,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    255,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    255,0,0,0,
  ], [255,0,0], 10, false, [])
  expect(plots).toEqual([
    {
      id: 0,
      xPx: 1,
      yPx: 1,
    },
  ])
})

test(`automatic extraction
rrr
www
rrr
`, () => {
  const plots = extractor.execute(3,3,[
    255,0,0,0,
    255,0,0,0,
    255,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    255,0,0,0,
    255,0,0,0,
    255,0,0,0,
  ], [255,0,0], 10, false, [])
  expect(plots).toEqual([
    {
      id: 0,
      xPx: 1,
      yPx: 0,
    },
    {
      id: 1,
      xPx: 1,
      yPx: 2,
    },
  ])
})

test(`automatic extraction
rrr
rrw
rww
`, () => {
  const plots = extractor.execute(3,3,[
    255,0,0,0,
    255,0,0,0,
    255,0,0,0,
    255,0,0,0,
    255,0,0,0,
    0,0,0,0,
    255,0,0,0,
    0,0,0,0,
    0,0,0,0,
  ], [255,0,0], 10, false, [])
  expect(plots).toEqual([
    {
      id: 0,
      xPx: 0.6666666666666666,
      yPx: 0.6666666666666666,
    },
  ])
})

test(`automatic extraction
rrrr
rrrr
wwww
rrrr
`, () => {
  const plots = extractor.execute(4,4,[
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
  ], [255,0,0], 10, false, [])
  expect(plots).toEqual([
    {
      id: 0,
      xPx: 1.5,
      yPx: 0.5,
    },
    {
      id: 1,
      xPx: 1.5,
      yPx: 3,
    },
  ])
})

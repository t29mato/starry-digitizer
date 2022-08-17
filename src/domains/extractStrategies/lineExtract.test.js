/* eslint-disable jest/valid-title */
/* eslint-disable prettier/prettier */
import LineExtract from './lineExtract'

const extractor = LineExtract.instance
extractor.lineWidthPx = 1
extractor.intervalPx = 3

// r: red, w: white
test(`automatic extraction
wwwwww
rrrrrr
wwwwww
`, () => {
  const plots = extractor.execute(6,6,[
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
    0,0,0,0,
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
    0,0,0,0,
    0,0,0,0,
  ], [], false, [255,0,0], 10)
  expect(plots).toEqual([
    {
      "id": 0,
      "xPx": 2,
      "yPx": 1.5,
    },
    {
      "id": 1,
      "xPx": 5,
      "yPx": 1.5,
    },
  ])
})

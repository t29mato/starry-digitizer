/* eslint-disable prettier/prettier */
import LineExtract from './LineExtract'

const extractor = new LineExtract({width: 1, interval: 3})

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
  ], [255,0,0], 10, [], false)
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


/* eslint-disable jest/valid-title */
/* eslint-disable prettier/prettier */
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
    const coords = extractor.execute(6, 6, [
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        255, 0, 0, 0,
        255, 0, 0, 0,
        255, 0, 0, 0,
        255, 0, 0, 0,
        255, 0, 0, 0,
        255, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
    ], [], false, [255, 0, 0], 10)
    expect(coords).toEqual([{
            "xPx": 1,
            "yPx": 1.5,
        },
        {
            "xPx": 3,
            "yPx": 1.5,
        },
        {
            "xPx": 5,
            "yPx": 1.5,
        },
    ])
})

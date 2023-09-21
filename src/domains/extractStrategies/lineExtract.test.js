import LineExtract from './lineExtract'
import { expect, test } from '@jest/globals'

/* eslint-disable jest/valid-title */
/* eslint-disable prettier/prettier */

const extractor = LineExtract.instance
extractor.dxPx = 1
extractor.dyPx = 3

// r: red, w: white
test(`automatic extraction
wwwwww
rrrrrr
wwwwww
`, () => {
    const plots = extractor.execute(6, 6, [
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
    expect(plots).toEqual([{
            "id": 0,
            "xPx": 1,
            "yPx": 1.5,
        },
        {
            "id": 1,
            "xPx": 3,
            "yPx": 1.5,
        },
        {
            "id": 2,
            "xPx": 5,
            "yPx": 1.5,
        },
    ])
})
